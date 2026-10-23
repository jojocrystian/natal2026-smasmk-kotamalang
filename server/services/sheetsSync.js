const db = require('../db');

// Google Apps Script template code provided to user
const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Google Apps Script untuk Auto Backup Web Registrasi & Absensi Acara
 * 
 * CARA MENGGUNAKAN:
 * 1. Buka Google Sheets baru di spreadsheet Google Anda.
 * 2. Klik menu "Ekstensi" (Extensions) -> "Apps Script".
 * 3. Hapus semua kode yang ada di editor, lalu paste kode ini.
 * 4. Klik "Simpan" (ikon disket).
 * 5. Klik tombol "Terapkan" (Deploy) di kanan atas -> pilih "Penerapan baru" (New deployment).
 * 6. Pilih jenis: "Aplikasi Web" (Web app).
 * 7. Konfigurasi:
 *    - Jalankan sebagai (Execute as): "Saya" (Me)
 *    - Siapa yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> PENTING!
 * 8. Klik "Terapkan" (Deploy), berikan izin Google jika diminta.
 * 9. Salin "URL Aplikasi Web" (Web App URL) dan paste di Dashboard Admin -> Pengaturan Spreadsheet.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    
    // Pastikan header ada di baris pertama
    ensureHeaders(sheet);
    
    if (action === "test") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Koneksi Google Spreadsheet berhasil terhubung!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "register") {
      var p = contents.participant;
      sheet.appendRow([
        p.code,
        p.full_name,
        p.nickname,
        p.school,
        p.grade,
        p.email,
        "Belum Hadir",
        "-",
        "-",
        p.created_at || new Date().toLocaleString("id-ID")
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "registered" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "attend") {
      var p = contents.participant;
      var data = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == p.code) { // Match ID Code
          sheet.getRange(i + 1, 7).setValue("Hadir");
          sheet.getRange(i + 1, 8).setValue(p.attended_at);
          sheet.getRange(i + 1, 9).setValue(p.scanned_by || "Panitia");
          found = true;
          break;
        }
      }
      if (!found) {
        // Jika belum ada di baris, tambahkan
        sheet.appendRow([
          p.code,
          p.full_name,
          p.nickname,
          p.school,
          p.grade,
          p.email,
          "Hadir",
          p.attended_at,
          p.scanned_by || "Panitia",
          p.created_at || new Date().toLocaleString("id-ID")
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "attended" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update") {
      var p = contents.participant;
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == p.code) {
          sheet.getRange(i + 1, 2).setValue(p.full_name);
          sheet.getRange(i + 1, 3).setValue(p.nickname);
          sheet.getRange(i + 1, 4).setValue(p.school);
          sheet.getRange(i + 1, 5).setValue(p.grade);
          sheet.getRange(i + 1, 6).setValue(p.email);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "delete") {
      var code = contents.code;
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == code) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "deleted" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "sync_all") {
      var list = contents.participants || [];
      sheet.clearContents();
      ensureHeaders(sheet);
      for (var j = 0; j < list.length; j++) {
        var item = list[j];
        sheet.appendRow([
          item.code,
          item.full_name,
          item.nickname,
          item.school,
          item.grade,
          item.email,
          item.attended ? "Hadir" : "Belum Hadir",
          item.attended_at || "-",
          item.scanned_by || "-",
          item.created_at || "-"
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: list.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ignored" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureHeaders(sheet) {
  var headers = [
    "ID Peserta",
    "Nama Lengkap",
    "Nama Panggilan",
    "Asal Sekolah",
    "Kelas",
    "Email",
    "Status Kehadiran",
    "Waktu Presensi",
    "Diverifikasi Oleh",
    "Waktu Pendaftaran"
  ];
  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow[0] !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#16a34a");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
}
`;

/**
 * Send event payload to configured Google Sheets Webhook URL
 */
async function syncToSheets(payload) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_sheets_webhook_url');
    const webhookUrl = row ? row.value?.trim() : '';

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return { skipped: true, reason: 'Webhook URL not configured' };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow', // Google Apps Script redirects with 302
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (payload.participant && payload.participant.id) {
      db.prepare('UPDATE participants SET backup_synced = 1 WHERE id = ?').run(payload.participant.id);
    }

    return { success: true, data };
  } catch (error) {
    console.warn('[Google Sheets Sync Error]:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  syncToSheets,
  GOOGLE_APPS_SCRIPT_CODE
};
