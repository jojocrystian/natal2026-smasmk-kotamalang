const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('./auth');
const { syncToSheets, GOOGLE_APPS_SCRIPT_CODE } = require('../services/sheetsSync');
const { testSmtp } = require('../services/emailService');

// GET settings (Admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  // Mask SMTP password for security
  const maskedSettings = { ...settings };
  if (maskedSettings.smtp_pass) {
    maskedSettings.has_smtp_pass = true;
    maskedSettings.smtp_pass = '********';
  } else {
    maskedSettings.has_smtp_pass = false;
  }

  res.json({
    settings: maskedSettings,
    appsScriptCode: GOOGLE_APPS_SCRIPT_CODE
  });
});

// PUT update settings (Admin only)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  const updates = req.body;
  const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, val] of Object.entries(updates)) {
    // If password is still masked, don't overwrite
    if (key === 'smtp_pass' && val === '********') {
      continue;
    }
    setStmt.run(key, String(val ?? ''));
  }

  res.json({ message: 'Pengaturan berhasil disimpan!' });
});

// POST test Google Sheets Webhook
router.post('/test-sheets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    const targetUrl = url || db.prepare('SELECT value FROM settings WHERE key = ?').get('google_sheets_webhook_url')?.value;

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'URL Webhook Google Sheets tidak valid atau belum diisi.' });
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', timestamp: new Date().toISOString() }),
      redirect: 'follow'
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json({
      success: true,
      message: 'Berhasil menghubungi Webhook Google Spreadsheet!',
      response: data
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghubungi Webhook: ' + error.message });
  }
});

// POST sync all participants to Google Sheets
router.post('/sync-all-sheets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const participants = db.prepare('SELECT * FROM participants ORDER BY id ASC').all();
    
    const result = await syncToSheets({
      action: 'sync_all',
      timestamp: new Date().toISOString(),
      participants
    });

    if (result.success) {
      db.prepare('UPDATE participants SET backup_synced = 1').run();
      res.json({
        success: true,
        message: `Berhasil mencadangkan ${participants.length} data peserta ke Google Spreadsheet!`,
        result
      });
    } else {
      res.status(400).json({
        error: result.error || 'Sinkronisasi gagal. Pastikan URL Webhook sudah benar.',
        details: result
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan sinkronisasi: ' + error.message });
  }
});

// POST test SMTP connection
router.post('/test-smtp', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { host, port, user, pass, from, targetEmail } = req.body;

    // Use passed config or fall back to saved DB config
    let finalPass = pass;
    if (!pass || pass === '********') {
      const dbPass = db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_pass');
      finalPass = dbPass ? dbPass.value : '';
    }

    const config = {
      host: host || db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_host')?.value,
      port: port || db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_port')?.value || '587',
      user: user || db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_user')?.value,
      pass: finalPass,
      from: from || db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_from')?.value
    };

    const result = await testSmtp(config, targetEmail);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
