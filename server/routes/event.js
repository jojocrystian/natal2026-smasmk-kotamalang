const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('./auth');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'flyer-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPG, PNG, WEBP, GIF) yang diizinkan!'));
    }
  }
});

// GET current event information (Public)
router.get('/', (req, res) => {
  const event = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get() || {};
  const countRow = db.prepare('SELECT COUNT(*) as count FROM participants').get();
  const registeredCount = countRow ? countRow.count : 0;
  res.json({
    event: {
      ...event,
      registered_count: registeredCount,
      quota: event.quota || 500,
      registration_status: event.registration_status || 'open'
    }
  });
});

// PUT update event information (Admin only)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  const { title, date, time, location, description, flyer_url } = req.body;

  if (!title || !date || !time || !location) {
    return res.status(400).json({ error: 'Judul acara, tanggal, waktu, dan tempat wajib diisi.' });
  }

  const existing = db.prepare('SELECT id FROM events ORDER BY id ASC LIMIT 1').get();
  if (existing) {
    db.prepare(`
      UPDATE events
      SET title = ?, date = ?, time = ?, location = ?, description = ?, flyer_url = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(title.trim(), date.trim(), time.trim(), location.trim(), (description || '').trim(), (flyer_url || '').trim(), existing.id);
  } else {
    db.prepare(`
      INSERT INTO events (title, date, time, location, description, flyer_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title.trim(), date.trim(), time.trim(), location.trim(), (description || '').trim(), (flyer_url || '').trim());
  }

  const updated = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get();
  res.json({ message: 'Informasi acara berhasil diperbarui.', event: updated });
});

// POST upload flyer image (Admin only)
router.post('/upload-flyer', authenticateToken, requireAdmin, upload.single('flyer'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah.' });
  }

  const flyerUrl = `/uploads/${req.file.filename}`;
  const existing = db.prepare('SELECT id FROM events ORDER BY id ASC LIMIT 1').get();
  if (existing) {
    db.prepare('UPDATE events SET flyer_url = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?')
      .run(flyerUrl, existing.id);
  }

  res.json({
    message: 'Flyer berhasil diunggah.',
    flyer_url: flyerUrl
  });
});

module.exports = router;
