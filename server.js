import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// ===== JSON File Database =====
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = join(DATA_DIR, 'db.json');

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading DB:', e);
  }
  return { users: {}, userData: {} };
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data));
}

function genId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ===== Auth APIs =====
app.post('/api/auth/register', (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.json({ ok: false, msg: '请填写手机号和密码' });

    const db = readDB();
    const existingUser = Object.values(db.users).find(u => u.phone === phone);
    if (existingUser) return res.json({ ok: false, msg: '该手机号已注册' });

    const id = genId();
    db.users[id] = { id, phone, password, createdAt: new Date().toISOString() };
    db.userData[id] = {};
    writeDB(db);

    console.log(`User registered: ${phone} (${id})`);
    res.json({ ok: true, msg: '注册成功', userId: id, token: id });
  } catch (e) {
    console.error('Register error:', e);
    res.json({ ok: false, msg: '注册失败，请重试' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.json({ ok: false, msg: '请填写手机号和密码' });

    const db = readDB();
    const user = Object.values(db.users).find(u => u.phone === phone && u.password === password);
    if (!user) return res.json({ ok: false, msg: '手机号或密码错误' });

    console.log(`User logged in: ${phone} (${user.id})`);
    res.json({ ok: true, msg: '登录成功', userId: user.id, token: user.id });
  } catch (e) {
    console.error('Login error:', e);
    res.json({ ok: false, msg: '登录失败，请重试' });
  }
});

// ===== Data Sync APIs =====
app.get('/api/data', (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ ok: false, msg: '未登录' });

    const db = readDB();
    const data = db.userData[token] || {};
    res.json({ ok: true, data });
  } catch (e) {
    console.error('Get data error:', e);
    res.json({ ok: true, data: {} });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ ok: false, msg: '未登录' });

    const db = readDB();
    db.userData[token] = req.body.data || {};
    writeDB(db);

    res.json({ ok: true });
  } catch (e) {
    console.error('Save data error:', e);
    res.json({ ok: false, msg: '保存失败' });
  }
});

// ===== Serve Static Files =====
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback for client-side routing
app.use((req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});
