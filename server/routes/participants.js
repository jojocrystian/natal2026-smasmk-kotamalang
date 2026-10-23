const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('./auth');
const { syncToSheets } = require('../services/sheetsSync');
const { sendTicketEmail } = require('../services/emailService');
const { generateTicketPdf } = require('../services/pdfService');

/**
 * Helper to generate unique participant code: {NoUrut}_{NamaPanggilan}
 * e.g. 001_Budi
 */
function generateParticipantCode(nickname) {
  // Clean nickname: letters and numbers only, capitalize
  let clean = (nickname || 'Peserta').trim().replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) clean = 'Peserta';
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  // Get total count + 1
  const countRow = db.prepare('SELECT COUNT(*) as count FROM participants').get();
  let seq = (countRow ? countRow.count : 0) + 1;

  let code = `${String(seq).padStart(3, '0')}_${clean}`;

  // Ensure absolute uniqueness in database
  let check = db.prepare('SELECT id FROM participants WHERE code = ?').get(code);
  while (check) {
    seq++;
    code = `${String(seq).padStart(3, '0')}_${clean}`;
    check = db.prepare('SELECT id FROM participants WHERE code = ?').get(code);
  }

  return code;
}

/**
 * Public Registration
 */
router.post('/register', async (req, res) => {
  try {
    const { full_name, nickname, school, grade, email } = req.body;

    if (!full_name || !nickname || !school || !grade || !email) {
      return res.status(400).json({ error: 'Semua kolom wajib diisi!' });
    }

    const validGrades = ['X', 'XI', 'XII', 'Alumni'];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({ error: 'Pilihan kelas tidak valid (Pilih: X, XI, XII, atau Alumni).' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFullName = full_name.trim();

    // Check Event Status & Quota
    const event = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get() || {};
    const regStatus = (event.registration_status || 'open').toLowerCase();
    const quota = event.quota !== undefined && event.quota !== null ? Number(event.quota) : 500;
    const countRow = db.prepare('SELECT COUNT(*) as count FROM participants').get();
    const currentCount = countRow ? countRow.count : 0;

    if (regStatus === 'closed') {
      return res.status(400).json({ error: 'Pendaftaran saat ini telah resmi ditutup oleh panitia.' });
    }
    if (regStatus === 'upcoming') {
      return res.status(400).json({ error: 'Pendaftaran belum dibuka. Silakan tunggu jadwal pembukaan resmi.' });
    }
    if (quota > 0 && currentCount >= quota) {
      return res.status(400).json({ error: `Kuota pendaftaran telah penuh (${currentCount}/${quota} peserta).` });
    }

    // RULE 1: Email and Nama Lengkap already registered CANNOT register again
    const existing = db.prepare(`
      SELECT code, full_name, email FROM participants 
      WHERE LOWER(email) = ? OR LOWER(full_name) = ?
    `).get(trimmedEmail, trimmedFullName.toLowerCase());

    if (existing) {
      if (existing.email.toLowerCase() === trimmedEmail) {
        return res.status(400).json({
          error: `Email "${email}" sudah terdaftar sebelumnya dengan ID ${existing.code} atas nama ${existing.full_name}. Setiap email hanya dapat mendaftar 1 kali.`
        });
      } else {
        return res.status(400).json({
          error: `Nama Lengkap "${full_name}" sudah terdaftar sebelumnya dengan ID ${existing.code}. Setiap peserta hanya dapat mendaftar 1 kali.`
        });
      }
    }

    const code = generateParticipantCode(nickname);

    // Generate QR Code data URL
    const qrImage = await QRCode.toDataURL(code, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    const insertStmt = db.prepare(`
      INSERT INTO participants (code, full_name, nickname, school, grade, email, qr_data, qr_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      code,
      trimmedFullName,
      nickname.trim(),
      school.trim(),
      grade,
      trimmedEmail,
      code,
      qrImage
    );

    const newParticipant = db.prepare('SELECT * FROM participants WHERE id = ?').get(result.lastInsertRowid);
    const eventInfo = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get() || {};

    // Asynchronously dispatch Google Sheets auto-backup
    syncToSheets({
      action: 'register',
      timestamp: new Date().toISOString(),
      participant: newParticipant
    }).catch(err => console.error('[Auto Backup Error]:', err));

    // Asynchronously send email with PDF ticket attached
    sendTicketEmail(newParticipant, eventInfo).catch(err => console.error('[Auto Email Error]:', err));

    res.status(201).json({
      message: 'Pendaftaran berhasil!',
      participant: newParticipant,
      event: eventInfo
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat mendaftar: ' + error.message });
  }
});

/**
 * Public Check / Lookup Ticket (By email, code, or full_name)
 * Returns only the matching participant's own ticket
 */
router.post('/check-ticket', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Masukkan email, kode tiket, atau nama lengkap untuk mencari tiket.' });
    }

    const q = query.trim().toLowerCase();
    const participant = db.prepare(`
      SELECT code, full_name, nickname, school, grade, email, qr_image, attended, attended_at
      FROM participants
      WHERE LOWER(email) = ? OR LOWER(code) = ? OR LOWER(full_name) = ?
      ORDER BY id DESC LIMIT 1
    `).get(q, q, q);

    if (!participant) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan. Pastikan data yang dimasukkan sama persis saat mendaftar.' });
    }

    const eventInfo = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get() || {};
    res.json({
      success: true,
      participant,
      event: eventInfo
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat mencari tiket: ' + error.message });
  }
});

/**
 * Manual Add Attendee by Panitia / Admin
 */
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const { full_name, nickname, school, grade, email } = req.body;

    if (!full_name || !nickname || !school || !grade || !email) {
      return res.status(400).json({ error: 'Semua kolom wajib diisi!' });
    }

    const validGrades = ['X', 'XI', 'XII', 'Alumni'];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({ error: 'Pilihan kelas tidak valid.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFullName = full_name.trim();

    const existing = db.prepare(`
      SELECT code, full_name, email FROM participants 
      WHERE LOWER(email) = ? OR LOWER(full_name) = ?
    `).get(trimmedEmail, trimmedFullName.toLowerCase());

    if (existing) {
      return res.status(400).json({
        error: `Peserta dengan email atau nama tersebut sudah terdaftar dengan ID ${existing.code} (${existing.full_name}).`
      });
    }

    const code = generateParticipantCode(nickname);
    const qrImage = await QRCode.toDataURL(code, {
      width: 400,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    });

    const result = db.prepare(`
      INSERT INTO participants (code, full_name, nickname, school, grade, email, qr_data, qr_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code,
      trimmedFullName,
      nickname.trim(),
      school.trim(),
      grade,
      trimmedEmail,
      code,
      qrImage
    );

    const newParticipant = db.prepare('SELECT * FROM participants WHERE id = ?').get(result.lastInsertRowid);
    const eventInfo = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get() || {};

    // Auto backup to Google Sheets
    syncToSheets({
      action: 'register',
      timestamp: new Date().toISOString(),
      participant: newParticipant
    }).catch(err => console.error('[Auto Backup Error]:', err));

    // Send ticket email
    sendTicketEmail(newParticipant, eventInfo).catch(err => console.error('[Auto Email Error]:', err));

    res.status(201).json({
      message: 'Peserta berhasil ditambahkan secara manual!',
      participant: newParticipant
    });
  } catch (error) {
    console.error('Manual Add Error:', error);
    res.status(500).json({ error: 'Gagal menambahkan peserta: ' + error.message });
  }
});

/**
 * Scan QR Code or Input ID
 */
router.post('/scan', authenticateToken, (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Kode ID atau QR Code tidak boleh kosong.' });
    }

    const cleanCode = code.trim();
    const participant = db.prepare(`
      SELECT * FROM participants 
      WHERE LOWER(code) = LOWER(?) OR LOWER(qr_data) = LOWER(?)
    `).get(cleanCode, cleanCode);

    if (!participant) {
      return res.status(404).json({
        error: `Data peserta dengan kode "${cleanCode}" tidak ditemukan di sistem!`
      });
    }

    // RULE: Scan hanya 1 kali
    if (participant.attended === 1) {
      return res.status(400).json({
        already_attended: true,
        participant,
        error: `Peserta SUDAH melakukan presensi sebelumnya!`,
        details: {
          code: participant.code,
          name: participant.full_name,
          attended_at: participant.attended_at,
          scanned_by: participant.scanned_by || 'Panitia'
        }
      });
    }

    // Mark as attended
    const verifier = req.user.name || req.user.username;
    db.prepare(`
      UPDATE participants 
      SET attended = 1, attended_at = datetime('now', 'localtime'), scanned_by = ?
      WHERE id = ?
    `).run(verifier, participant.id);

    const updated = db.prepare('SELECT * FROM participants WHERE id = ?').get(participant.id);

    // Sync attendance to Google Sheets
    syncToSheets({
      action: 'attend',
      timestamp: new Date().toISOString(),
      participant: updated
    }).catch(err => console.error('[Google Sheets Sync Attend Error]:', err));

    res.json({
      success: true,
      message: `Presensi BERHASIL! Selamat datang, ${updated.full_name}.`,
      participant: updated
    });
  } catch (error) {
    console.error('Scan Error:', error);
    res.status(500).json({ error: 'Gagal memproses presensi: ' + error.message });
  }
});

/**
 * List participants with Search & Filters
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, school, grade, status, sort } = req.query;

    let query = 'SELECT * FROM participants WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      query += ` AND (LOWER(full_name) LIKE ? OR LOWER(nickname) LIKE ? OR LOWER(code) LIKE ? OR LOWER(email) LIKE ? OR LOWER(school) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term, term, term);
    }

    if (school && school.trim()) {
      query += ` AND LOWER(school) = LOWER(?)`;
      params.push(school.trim());
    }

    if (grade && grade.trim()) {
      query += ` AND grade = ?`;
      params.push(grade.trim());
    }

    if (status === 'attended') {
      query += ` AND attended = 1`;
    } else if (status === 'unattended') {
      query += ` AND attended = 0`;
    }

    // Default newest to oldest
    if (sort === 'oldest') {
      query += ' ORDER BY id ASC';
    } else {
      query += ' ORDER BY id DESC';
    }

    const participants = db.prepare(query).all(...params);

    // Get list of distinct schools for filter dropdown
    const schools = db.prepare('SELECT DISTINCT school FROM participants ORDER BY school ASC')
      .all().map(r => r.school);

    res.json({
      participants,
      totalCount: participants.length,
      availableSchools: schools
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Gagal mengambil data peserta.' });
  }
});

/**
 * Live Stats and Counts
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM participants').get().count;
    const attended = db.prepare('SELECT COUNT(*) as count FROM participants WHERE attended = 1').get().count;
    const unattended = total - attended;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    // School breakdown stats
    const schoolStats = db.prepare(`
      SELECT 
        school,
        COUNT(*) as total,
        SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN attended = 0 THEN 1 ELSE 0 END) as unattended
      FROM participants
      GROUP BY school
      ORDER BY total DESC, school ASC
    `).all().map(row => ({
      ...row,
      attendanceRate: row.total > 0 ? Math.round((row.attended / row.total) * 100) : 0
    }));

    // Grade breakdown stats
    const gradeStats = db.prepare(`
      SELECT 
        grade,
        COUNT(*) as total,
        SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as attended
      FROM participants
      GROUP BY grade
      ORDER BY total DESC
    `).all();

    // Recent scans
    const recentScans = db.prepare(`
      SELECT code, full_name, school, grade, attended_at, scanned_by
      FROM participants
      WHERE attended = 1
      ORDER BY attended_at DESC
      LIMIT 6
    `).all();

    res.json({
      total,
      attended,
      unattended,
      attendanceRate,
      bySchool: schoolStats,
      byGrade: gradeStats,
      recentScans
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Gagal mengambil statistik presensi.' });
  }
});

/**
 * Edit Participant (Admin Only)
 */
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const participantId = parseInt(req.params.id, 10);
    const { full_name, nickname, school, grade, email } = req.body;

    if (!full_name || !nickname || !school || !grade || !email) {
      return res.status(400).json({ error: 'Semua kolom wajib diisi!' });
    }

    const target = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
    if (!target) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }

    // Check email uniqueness excluding self
    const duplicate = db.prepare(`
      SELECT id FROM participants 
      WHERE (LOWER(email) = LOWER(?) OR LOWER(full_name) = LOWER(?)) AND id != ?
    `).get(email.trim(), full_name.trim(), participantId);

    if (duplicate) {
      return res.status(400).json({ error: 'Email atau Nama Lengkap sudah digunakan oleh peserta lain.' });
    }

    db.prepare(`
      UPDATE participants
      SET full_name = ?, nickname = ?, school = ?, grade = ?, email = ?
      WHERE id = ?
    `).run(full_name.trim(), nickname.trim(), school.trim(), grade, email.trim(), participantId);

    const updated = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);

    // Sync update to Google Sheets
    syncToSheets({
      action: 'update',
      timestamp: new Date().toISOString(),
      participant: updated
    }).catch(err => console.error('[Sync Update Error]:', err));

    res.json({ message: 'Data peserta berhasil diperbarui.', participant: updated });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Gagal memperbarui data peserta.' });
  }
});

/**
 * Delete Participant (Admin Only)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const participantId = parseInt(req.params.id, 10);
    const target = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);

    if (!target) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }

    db.prepare('DELETE FROM participants WHERE id = ?').run(participantId);

    // Sync delete to Google Sheets
    syncToSheets({
      action: 'delete',
      code: target.code
    }).catch(err => console.error('[Sync Delete Error]:', err));

    res.json({ message: `Peserta ${target.full_name} (${target.code}) berhasil dihapus.` });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Gagal menghapus data peserta.' });
  }
});

/**
 * Toggle or Cancel Attendance (Admin / Panitia)
 */
router.post('/:id/toggle-attendance', authenticateToken, (req, res) => {
  try {
    const participantId = parseInt(req.params.id, 10);
    const target = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);

    if (!target) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }

    const { attended } = req.body;
    const shouldAttend = attended !== undefined ? Number(attended) === 1 : target.attended === 0;

    if (shouldAttend) {
      const verifier = req.user.name || req.user.username;
      db.prepare(`
        UPDATE participants
        SET attended = 1, attended_at = datetime('now', 'localtime'), scanned_by = ?
        WHERE id = ?
      `).run(verifier, participantId);
    } else {
      db.prepare(`
        UPDATE participants
        SET attended = 0, attended_at = NULL, scanned_by = NULL
        WHERE id = ?
      `).run(participantId);
    }

    const updated = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);

    // Sync to Sheets
    syncToSheets({
      action: shouldAttend ? 'attend' : 'cancel_attend',
      timestamp: new Date().toISOString(),
      participant: updated
    }).catch(err => console.error('[Sync Toggle Attendance Error]:', err));

    res.json({
      success: true,
      message: shouldAttend
        ? `Status hadir berhasil ditandai untuk ${updated.full_name}.`
        : `Status kehadiran ${updated.full_name} berhasil dibatalkan (Belum Hadir).`,
      participant: updated
    });
  } catch (error) {
    console.error('Toggle attendance error:', error);
    res.status(500).json({ error: 'Gagal memperbarui status kehadiran: ' + error.message });
  }
});

/**
 * Resend E-Ticket Email (Admin Only)
 */
router.post('/:id/resend-email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const participantId = parseInt(req.params.id, 10);
    const target = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);

    if (!target) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }

    if (!target.email) {
      return res.status(400).json({ error: 'Peserta tidak memiliki alamat email yang valid.' });
    }

    const eventInfo = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get() || {};
    const emailResult = await sendTicketEmail(target, eventInfo);

    if (emailResult.disabled) {
      return res.status(400).json({ error: 'Pengiriman email otomatis sedang dinonaktifkan di Pengaturan SMTP.' });
    }

    res.json({
      success: true,
      message: `Tiket berhasil dikirim ulang ke alamat email ${target.email}.`
    });
  } catch (error) {
    console.error('Resend email error:', error);
    res.status(500).json({ error: 'Gagal mengirim email tiket: ' + error.message });
  }
});

/**
 * Download Ticket PDF Buffer
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const participantId = parseInt(req.params.id, 10);
    const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);

    if (!participant) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }

    const eventInfo = db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get() || {};
    const pdfBuffer = await generateTicketPdf(participant, eventInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Tiket_${participant.code}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'Gagal membuat file PDF tiket.' });
  }
});

/**
 * Export CSV Backup for spreadsheet
 */
router.get('/export/csv', authenticateToken, (req, res) => {
  try {
    const participants = db.prepare('SELECT * FROM participants ORDER BY id ASC').all();

    // UTF-8 BOM for Microsoft Excel compatibility
    let csv = '\uFEFFID Peserta,Nama Lengkap,Nama Panggilan,Asal Sekolah,Kelas,Email,Status Presensi,Waktu Presensi,Diverifikasi Oleh,Waktu Pendaftaran\n';

    for (const p of participants) {
      const escape = (str) => `"${(str || '').replace(/"/g, '""')}"`;
      csv += [
        escape(p.code),
        escape(p.full_name),
        escape(p.nickname),
        escape(p.school),
        escape(p.grade),
        escape(p.email),
        escape(p.attended ? 'Hadir' : 'Belum Hadir'),
        escape(p.attended_at || '-'),
        escape(p.scanned_by || '-'),
        escape(p.created_at || '-')
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Backup_Peserta_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Gagal membuat file CSV backup.' });
  }
});

module.exports = router;
