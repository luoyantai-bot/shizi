import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// ===== Config =====
const JWT_SECRET = process.env.JWT_SECRET || 'literacy-app-secret-key-2024';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = process.env.PORT || 3000;

// ===== JSON File Database =====
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function readDB() {
  if (!existsSync(DB_FILE)) return { users: [], userData: {} };
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { users: [], userData: {} };
  }
}

function writeDB(db) {
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ===== Auth Middleware =====
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ msg: '未登录' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ msg: '登录已过期，请重新登录' });
  }
}

// ===== Auth Routes =====
app.post('/auth/register', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ msg: '请输入手机号和密码' });
  if (phone.length < 6) return res.status(400).json({ msg: '请输入有效的手机号' });
  if (password.length < 4) return res.status(400).json({ msg: '密码至少4位' });

  const db = readDB();
  if (db.users.find(u => u.phone === phone)) {
    return res.status(400).json({ msg: '该手机号已注册' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const user = { userId, phone, passwordHash, createdAt: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);

  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '90d' });
  res.json({
    token,
    user: { userId: user.userId, phone: user.phone, createdAt: user.createdAt }
  });
});

app.post('/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ msg: '请输入手机号和密码' });

  const db = readDB();
  const user = db.users.find(u => u.phone === phone);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ msg: '手机号或密码错误' });
  }

  const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '90d' });
  res.json({
    token,
    user: { userId: user.userId, phone: user.phone, createdAt: user.createdAt }
  });
});

app.get('/me', authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.userId === req.userId);
  if (!user) return res.status(404).json({ msg: '用户不存在' });
  res.json({ userId: user.userId, phone: user.phone, createdAt: user.createdAt });
});

// ===== Data Sync Routes =====
// GET all learning data for current user
app.get('/data/all', authMiddleware, (req, res) => {
  const db = readDB();
  const data = db.userData[req.userId] || {};
  res.json(data);
});

// POST sync all learning data
app.post('/data/sync', authMiddleware, (req, res) => {
  const db = readDB();
  db.userData[req.userId] = {
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  writeDB(db);
  res.json({ ok: true });
});

// ===== Serve Static Files =====
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 少儿识字乐园 server running on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});
