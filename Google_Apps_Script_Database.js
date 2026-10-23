/**
 * GOOGLE APPS SCRIPT - CLOUD DATABASE FOR EVENT REGISTRATION & ATTENDANCE
 * 
 * CARA MENGGUNAKAN (1 Menit):
 * 1. Buka https://sheets.new di browser Anda.
 * 2. Klik menu "Ekstensi" (Extensions) -> "Apps Script".
 * 3. Hapus semua kode di editor, lalu paste SELURUH isi file ini.
 * 4. Klik "Simpan" (ikon disket).
 * 5. Klik tombol biru "Terapkan" (Deploy) di kanan atas -> pilih "Penerapan baru" (New deployment).
 * 6. Klik ikon gerigi (Select type) -> pilih "Aplikasi Web" (Web app).
 * 7. Konfigurasi:
 *    - Deskripsi: Database Presensi
 *    - Jalankan sebagai (Execute as): "Saya" (Me)
 *    - Siapa yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> [PENTING!]
 * 8. Klik "Terapkan" (Deploy), berikan izin Google jika diminta.
 * 9. Salin "URL Aplikasi Web" (contoh: https://script.google.com/macros/s/AKfycb.../exec).
 * 10. Tempelkan URL tersebut ke website Anda (di menu Hubungkan Spreadsheet / Vercel Settings).
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    initSheets(ss);

    if (action === "test") {
      return jsonResponse({ status: "success", message: "Koneksi Google Spreadsheet berhasil!" });
    }

    if (action === "login") {
      var sheet = ss.getSheetByName("Users");
      var values = sheet.getDataRange().getValues();
      var username = (data.username || "").toLowerCase().trim();
      var password = String(data.password || "");
      
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).toLowerCase().trim() === username && String(values[i][1]) === password) {
          var user = {
            id: i,
            username: values[i][0],
            name: values[i][2],
            role: values[i][3]
          };
          return jsonResponse({ token: "sheet-token-" + new Date().getTime(), user: user });
        }
      }
      return jsonResponse({ error: "Username atau password salah." });
    }

    if (action === "getEvent") {
      var sheet = ss.getSheetByName("Acara");
      var values = sheet.getDataRange().getValues();
      var event = {};
      for (var i = 1; i < values.length; i++) {
        event[values[i][0]] = values[i][1];
      }
      var sheetP = ss.getSheetByName("Peserta");
      var count = Math.max(0, sheetP.getLastRow() - 1);
      event.registered_count = count;
      event.quota = event.quota ? parseInt(event.quota) : 500;
      event.registration_status = event.registration_status || "open";
      return jsonResponse({ event: event });
    }

    if (action === "checkTicket") {
      var query = (data.query || "").toString().trim().toLowerCase();
      if (!query) {
        return jsonResponse({ error: "Query pencarian tiket tidak boleh kosong." }, 400);
      }
      var sheetP = ss.getSheetByName("Peserta");
      var valuesP = sheetP.getDataRange().getValues();
      var found = null;
      for (var i = valuesP.length - 1; i >= 1; i--) {
        var r = valuesP[i];
        var code = (r[0] || "").toString().toLowerCase();
        var name = (r[1] || "").toString().toLowerCase();
        var email = (r[5] || "").toString().toLowerCase();
        if (code === query || name === query || email === query) {
          found = {
            id: i,
            code: String(r[0]),
            full_name: String(r[1]),
            nickname: String(r[2]),
            school: String(r[3]),
            grade: String(r[4]),
            email: String(r[5]),
            attended: r[6] === "Hadir" ? 1 : 0
          };
          break;
        }
      }
      if (!found) {
        return jsonResponse({ error: "Tiket tidak ditemukan. Periksa kembali email atau kode tiket Anda." }, 404);
      }
      var sAcara = ss.getSheetByName("Acara");
      var vAcara = sAcara.getDataRange().getValues();
      var ev = {};
      for (var j = 1; j < vAcara.length; j++) {
        ev[vAcara[j][0]] = vAcara[j][1];
      }
      return jsonResponse({ success: true, participant: found, event: ev });
    }

    if (action === "updateEvent") {
      var sheet = ss.getSheetByName("Acara");
      var keys = ["title", "date", "time", "location", "description", "flyer_url", "quota", "registration_status", "maps_url", "whatsapp"];
      sheet.clearContents();
      sheet.appendRow(["Key", "Value"]);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        sheet.appendRow([k, data[k] || ""]);
      }
      return jsonResponse({ message: "Acara berhasil diperbarui", event: data });
    }

    if (action === "register" || action === "addManual") {
      var sheet = ss.getSheetByName("Peserta");
      var values = sheet.getDataRange().getValues();
      var email = (data.email || "").toLowerCase().trim();
      var fullName = (data.full_name || "").toLowerCase().trim();

      // Check duplicate email & name (Rule 1)
      for (var i = 1; i < values.length; i++) {
        var existingCode = values[i][0];
        var existingName = String(values[i][1]).toLowerCase().trim();
        var existingEmail = String(values[i][5]).toLowerCase().trim();

        if (existingEmail === email) {
          return jsonResponse({ error: "Email " + data.email + " sudah terdaftar dengan ID " + existingCode + "." });
        }
        if (existingName === fullName) {
          return jsonResponse({ error: "Nama Lengkap " + data.full_name + " sudah terdaftar dengan ID " + existingCode + "." });
        }
      }

      // Generate sequence code: 001_Budi
      var nextNum = values.length;
      var cleanNick = (data.nickname || "Peserta").replace(/[^a-zA-Z0-9]/g, "");
      if (!cleanNick) cleanNick = "Peserta";
      cleanNick = cleanNick.charAt(0).toUpperCase() + cleanNick.slice(1);
      var code = ("000" + nextNum).slice(-3) + "_" + cleanNick;

      var createdAt = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

      var newRow = [
        code,
        data.full_name.trim(),
        data.nickname.trim(),
        data.school.trim(),
        data.grade,
        data.email.trim(),
        "Belum Hadir",
        "-",
        "-",
        createdAt
      ];

      sheet.appendRow(newRow);

      var participant = {
        id: nextNum,
        code: code,
        full_name: data.full_name.trim(),
        nickname: data.nickname.trim(),
        school: data.school.trim(),
        grade: data.grade,
        email: data.email.trim(),
        attended: 0,
        attended_at: null,
        scanned_by: null,
        created_at: createdAt
      };

      return jsonResponse({ message: "Registrasi berhasil!", participant: participant });
    }

    if (action === "scan") {
      var sheet = ss.getSheetByName("Peserta");
      var values = sheet.getDataRange().getValues();
      var codeToFind = (data.code || "").toLowerCase().trim();
      var rowIndex = -1;

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).toLowerCase().trim() === codeToFind) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return jsonResponse({ error: "Data peserta dengan ID " + data.code + " tidak ditemukan!" });
      }

      var rowData = values[rowIndex - 1];
      var isAttended = rowData[6] === "Hadir";

      var pObj = {
        id: rowIndex - 1,
        code: rowData[0],
        full_name: rowData[1],
        nickname: rowData[2],
        school: rowData[3],
        grade: rowData[4],
        email: rowData[5],
        attended: isAttended ? 1 : 0,
        attended_at: rowData[7] === "-" ? null : rowData[7],
        scanned_by: rowData[8] === "-" ? null : rowData[8],
        created_at: rowData[9]
      };

      if (isAttended) {
        return jsonResponse({
          already_attended: true,
          error: "Peserta SUDAH melakukan presensi sebelumnya!",
          participant: pObj
        });
      }

      var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
      var verifier = data.scanned_by || "Panitia Presensi";

      sheet.getRange(rowIndex, 7).setValue("Hadir");
      sheet.getRange(rowIndex, 8).setValue(nowStr);
      sheet.getRange(rowIndex, 9).setValue(verifier);

      pObj.attended = 1;
      pObj.attended_at = nowStr;
      pObj.scanned_by = verifier;

      return jsonResponse({
        success: true,
        message: "Presensi BERHASIL! Selamat datang, " + pObj.full_name + ".",
        participant: pObj
      });
    }

    if (action === "getParticipants") {
      var sheet = ss.getSheetByName("Peserta");
      var values = sheet.getDataRange().getValues();
      var list = [];
      var schoolsSet = {};

      for (var i = 1; i < values.length; i++) {
        var r = values[i];
        if (!r[0]) continue;
        var p = {
          id: i,
          code: String(r[0]),
          full_name: String(r[1]),
          nickname: String(r[2]),
          school: String(r[3]),
          grade: String(r[4]),
          email: String(r[5]),
          attended: r[6] === "Hadir" ? 1 : 0,
          attended_at: r[7] === "-" ? null : r[7],
          scanned_by: r[8] === "-" ? null : r[8],
          created_at: String(r[9])
        };
        schoolsSet[p.school] = true;
        list.push(p);
      }

      // Filter by search / school / grade / status
      var search = (data.search || "").toLowerCase().trim();
      var school = (data.school || "").toLowerCase().trim();
      var grade = (data.grade || "").trim();
      var status = data.status;
      var sort = data.sort;

      var filtered = list.filter(function(item) {
        if (search) {
          var matchSearch = item.full_name.toLowerCase().indexOf(search) !== -1 ||
                             item.nickname.toLowerCase().indexOf(search) !== -1 ||
                             item.code.toLowerCase().indexOf(search) !== -1 ||
                             item.school.toLowerCase().indexOf(search) !== -1 ||
                             item.email.toLowerCase().indexOf(search) !== -1;
          if (!matchSearch) return false;
        }
        if (school && item.school.toLowerCase() !== school) return false;
        if (grade && item.grade !== grade) return false;
        if (status === "attended" && item.attended !== 1) return false;
        if (status === "unattended" && item.attended !== 0) return false;
        return true;
      });

      if (sort === "oldest") {
        filtered.sort(function(a, b) { return a.id - b.id; });
      } else {
        filtered.sort(function(a, b) { return b.id - a.id; });
      }

      return jsonResponse({
        participants: filtered,
        totalCount: filtered.length,
        availableSchools: Object.keys(schoolsSet).sort()
      });
    }

    if (action === "getStats") {
      var sheet = ss.getSheetByName("Peserta");
      var values = sheet.getDataRange().getValues();
      var total = 0;
      var attended = 0;
      var schoolMap = {};
      var recent = [];

      for (var i = 1; i < values.length; i++) {
        var r = values[i];
        if (!r[0]) continue;
        total++;
        var isAtt = r[6] === "Hadir";
        if (isAtt) attended++;

        var sch = String(r[3] || "Lainnya");
        if (!schoolMap[sch]) {
          schoolMap[sch] = { school: sch, total: 0, attended: 0, unattended: 0 };
        }
        schoolMap[sch].total++;
        if (isAtt) {
          schoolMap[sch].attended++;
          recent.push({
            code: r[0],
            full_name: r[1],
            school: r[3],
            grade: r[4],
            attended_at: r[7],
            scanned_by: r[8]
          });
        } else {
          schoolMap[sch].unattended++;
        }
      }

      var bySchool = [];
      for (var s in schoolMap) {
        var obj = schoolMap[s];
        obj.attendanceRate = obj.total > 0 ? Math.round((obj.attended / obj.total) * 100) : 0;
        bySchool.push(obj);
      }
      bySchool.sort(function(a, b) { return b.total - a.total; });

      var rate = total > 0 ? Math.round((attended / total) * 100) : 0;

      return jsonResponse({
        total: total,
        attended: attended,
        unattended: total - attended,
        attendanceRate: rate,
        bySchool: bySchool,
        recentScans: recent.slice(-6).reverse()
      });
    }

    if (action === "updateParticipant") {
      var sheet = ss.getSheetByName("Peserta");
      var values = sheet.getDataRange().getValues();
      var targetId = data.id;
      if (targetId >= 1 && targetId < values.length) {
        var row = targetId + 1;
        if (data.full_name) sheet.getRange(row, 2).setValue(data.full_name);
        if (data.nickname) sheet.getRange(row, 3).setValue(data.nickname);
        if (data.school) sheet.getRange(row, 4).setValue(data.school);
        if (data.grade) sheet.getRange(row, 5).setValue(data.grade);
        if (data.email) sheet.getRange(row, 6).setValue(data.email);
        return jsonResponse({ message: "Data berhasil diperbarui!" });
      }
      return jsonResponse({ error: "Peserta tidak ditemukan." });
    }

    if (action === "deleteParticipant") {
      var sheet = ss.getSheetByName("Peserta");
      var targetId = data.id;
      if (targetId >= 1) {
        sheet.deleteRow(targetId + 1);
        return jsonResponse({ message: "Peserta berhasil dihapus!" });
      }
      return jsonResponse({ error: "Peserta tidak ditemukan." });
    }

    if (action === "toggleAttendance") {
      var sheet = ss.getSheetByName("Peserta");
      var targetId = data.id;
      if (targetId >= 1) {
        var row = targetId + 1;
        var shouldAttend = data.attended === 1;
        if (shouldAttend) {
          var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
          var verifier = data.scanned_by || "Admin";
          sheet.getRange(row, 7).setValue("Hadir");
          sheet.getRange(row, 8).setValue(nowStr);
          sheet.getRange(row, 9).setValue(verifier);
        } else {
          sheet.getRange(row, 7).setValue("Belum Hadir");
          sheet.getRange(row, 8).setValue("-");
          sheet.getRange(row, 9).setValue("-");
        }
        return jsonResponse({
          success: true,
          message: shouldAttend ? "Status presensi berhasil ditandai hadir." : "Status kehadiran berhasil dibatalkan."
        });
      }
      return jsonResponse({ error: "Peserta tidak ditemukan." });
    }


    if (action === "getUsers") {
      var sheet = ss.getSheetByName("Users");
      var values = sheet.getDataRange().getValues();
      var users = [];
      for (var i = 1; i < values.length; i++) {
        if (!values[i][0]) continue;
        users.push({
          id: i,
          username: values[i][0],
          name: values[i][2],
          role: values[i][3]
        });
      }
      return jsonResponse({ users: users });
    }

    if (action === "addUser") {
      var sheet = ss.getSheetByName("Users");
      sheet.appendRow([data.username, data.password, data.name, data.role]);
      return jsonResponse({ message: "User berhasil ditambahkan!" });
    }

    if (action === "deleteUser") {
      var sheet = ss.getSheetByName("Users");
      if (data.id >= 1) {
        sheet.deleteRow(data.id + 1);
        return jsonResponse({ message: "User berhasil dihapus!" });
      }
      return jsonResponse({ error: "User tidak ditemukan." });
    }

    return jsonResponse({ error: "Action '" + action + "' tidak dikenali." });

  } catch (err) {
    return jsonResponse({ error: "Internal Error: " + err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({
    status: "ok",
    message: "Google Spreadsheet Database Backend Active!"
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function initSheets(ss) {
  // Ensure Tab "Peserta"
  var sPeserta = ss.getSheetByName("Peserta");
  if (!sPeserta) {
    sPeserta = ss.insertSheet("Peserta");
    var headers = ["ID Peserta", "Nama Lengkap", "Nama Panggilan", "Asal Sekolah", "Kelas", "Email", "Status Presensi", "Waktu Presensi", "Diverifikasi Oleh", "Waktu Pendaftaran"];
    sPeserta.appendRow(headers);
    var r = sPeserta.getRange(1, 1, 1, headers.length);
    r.setFontWeight("bold").setBackground("#16a34a").setFontColor("#ffffff");
    sPeserta.setFrozenRows(1);
  }

  // Ensure Tab "Users"
  var sUsers = ss.getSheetByName("Users");
  if (!sUsers) {
    sUsers = ss.insertSheet("Users");
    var uHeaders = ["Username", "Password", "Nama", "Role"];
    sUsers.appendRow(uHeaders);
    sUsers.getRange(1, 1, 1, uHeaders.length).setFontWeight("bold").setBackground("#3b82f6").setFontColor("#ffffff");
    sUsers.appendRow(["admin", "admin123", "Super Administrator", "admin"]);
    sUsers.appendRow(["panitia", "panitia123", "Panitia Presensi", "panitia"]);
    sUsers.setFrozenRows(1);
  }

  // Ensure Tab "Acara"
  var sAcara = ss.getSheetByName("Acara");
  if (!sAcara) {
    sAcara = ss.insertSheet("Acara");
    sAcara.appendRow(["Key", "Value"]);
    sAcara.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#8b5cf6").setFontColor("#ffffff");
    sAcara.appendRow(["title", "Natal Bersama SMA/SMK Kota Malang 2026"]);
    sAcara.appendRow(["date", "25 Oktober 2026"]);
    sAcara.appendRow(["time", "08:00 - 13:00 WIB"]);
    sAcara.appendRow(["location", "Auditorium Utama & Convention Hall"]);
    sAcara.appendRow(["description", "Acara akbar perayaan Natal bersama pelajar SMA/SMK se-Kota Malang."]);
    sAcara.appendRow(["flyer_url", ""]);
    sAcara.setFrozenRows(1);
  }
}
