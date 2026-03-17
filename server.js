import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// ===== Data Storage =====
// On Railway, set DATA_DIR env var to a persistent volume path (e.g., /data)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'server-data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = join(DATA_DIR, 'db.json');

function loadDB() {
  if (!existsSync(DB_FILE)) return { users: [], sessions: [] };
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { users: [], sessions: [] };
  }
}

function saveDB(db) {
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ===== Auth Middleware =====
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });

  const db = loadDB();
  const session = db.sessions.find(s => s.token === token);
  if (!session) return res.status(401).json({ error: '登录已过期' });

  const user = db.users.find(u => u.userId === session.userId);
  if (!user) return res.status(401).json({ error: '用户不存在' });

  req.user = user;
  req.db = db;
  next();
}

// ===== API Routes =====

// Register
app.post('/api/auth/register', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  const db = loadDB();
  if (db.users.find(u => u.phone === phone)) {
    return res.status(400).json({ error: '该手机号已注册' });
  }

  const userId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');

  db.users.push({
    userId,
    phone,
    password, // plain text for MVP simplicity
    createdAt: new Date().toISOString(),
    localData: {},
  });
  db.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  saveDB(db);

  console.log(`[Register] phone=${phone} userId=${userId}`);
  res.json({ ok: true, token, userId });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;

  const db = loadDB();
  const user = db.users.find(u => u.phone === phone && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '手机号或密码错误' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({ token, userId: user.userId, createdAt: new Date().toISOString() });

  // Keep at most 20 sessions per user
  const userSessions = db.sessions.filter(s => s.userId === user.userId);
  if (userSessions.length > 20) {
    const toRemove = new Set(userSessions.slice(0, userSessions.length - 20).map(s => s.token));
    db.sessions = db.sessions.filter(s => !toRemove.has(s.token));
  }
  saveDB(db);

  console.log(`[Login] phone=${phone} userId=${user.userId}`);
  res.json({ ok: true, token, userId: user.userId });
});

// Upload all localStorage data to cloud
app.post('/api/sync/upload', auth, (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: '无效数据' });
  }

  const db = req.db;
  const user = db.users.find(u => u.userId === req.user.userId);
  if (user) {
    user.localData = data;
    user.lastSyncAt = new Date().toISOString();
    saveDB(db);
  }

  res.json({ ok: true });
});

// Download localStorage data from cloud
app.get('/api/sync/download', auth, (req, res) => {
  res.json({ ok: true, data: req.user.localData || {} });
});

// Health check
app.get('/api/health', (_req, res) => {
  const db = loadDB();
  res.json({
    status: 'ok',
    users: db.users.length,
    dataDir: DATA_DIR,
    time: new Date().toISOString(),
  });
});

// ===== Static Files =====
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback — all non-API routes serve index.html
// Express 4 supports '*' wildcard directly
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`📂 Static files: ${distPath}`);
});
