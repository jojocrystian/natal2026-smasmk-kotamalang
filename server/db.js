const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    flyer_url TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'panitia')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    school TEXT NOT NULL,
    grade TEXT NOT NULL,
    email TEXT NOT NULL,
    qr_data TEXT NOT NULL,
    qr_image TEXT,
    attended INTEGER DEFAULT 0,
    attended_at TEXT,
    scanned_by TEXT,
    backup_synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default event if empty
const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
if (eventCount === 0) {
  db.prepare(`
    INSERT INTO events (title, date, time, location, description, flyer_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'Natal SMA & SMK Kota Malang 2026',
    '2026-01-28',
    '09:00 - 13:00 WIB',
    'Auditorium NICC, Jl. Kolonel Sugiono No. 24, Sukun, Kota Malang',
    'Ibadah dan Perayaan Natal bersama seluruh pelajar SMA dan SMK se-Kota Malang 2026. Daftarkan diri Anda secara online untuk mendapatkan E-Tiket resmi dengan QR Code presensi instan.',
    ''
  );
}

// Seed default users if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const panitiaHash = bcrypt.hashSync('panitia123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (username, password, name, role)
    VALUES (?, ?, ?, ?)
  `);

  insertUser.run('admin', adminHash, 'Super Admin', 'admin');
  insertUser.run('panitia', panitiaHash, 'Panitia Presensi', 'panitia');
}

// Seed default settings if empty
const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

const defaultSettings = {
  google_sheets_webhook_url: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  smtp_enabled: '0'
};

for (const [key, val] of Object.entries(defaultSettings)) {
  if (!getSetting.get(key)) {
    setSetting.run(key, val);
  }
}

module.exports = db;
