const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'secret-presensi-token-key-2026';

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sesi login telah kedaluwarsa atau tidak valid.' });
    }
    req.user = user;
    next();
  });
}

// Middleware to check Admin role
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Hanya Admin yang memiliki hak akses ini.' });
  }
}

// Login Endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());

  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: payload
  });
});

// Check current session
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }
  res.json({ user });
});

// User Management (Admin Only)
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, created_at FROM users ORDER BY id ASC').all();
  res.json({ users });
});

router.post('/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Semua kolom (username, password, nama, role) wajib diisi.' });
  }

  if (!['admin', 'panitia'].includes(role)) {
    return res.status(400).json({ error: 'Role hanya boleh "admin" atau "panitia".' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Username tersebut sudah digunakan.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password, name, role)
    VALUES (?, ?, ?, ?)
  `).run(username.trim(), hashedPassword, name.trim(), role);

  res.status(201).json({
    message: 'User baru berhasil ditambahkan.',
    user: {
      id: result.lastInsertRowid,
      username: username.trim(),
      name: name.trim(),
      role
    }
  });
});

router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login.' });
  }

  const target = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!target) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ message: `User "${target.username}" berhasil dihapus.` });
});

module.exports = {
  router,
  authenticateToken,
  requireAdmin
};
