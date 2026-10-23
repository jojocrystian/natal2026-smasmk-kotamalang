# Sistem Registrasi & Presensi Acara Berbasis Website

Aplikasi web modern, responsif, dan terpadu untuk pendaftaran peserta acara dan absensi kehadiran menggunakan QR Code, tiket e-pass PDF otomatis, serta fitur pencadangan otomatis (Auto Backup) ke Google Spreadsheet.

---

## 🔗 Pemisahan Link Akses (Tiga Portal Terpisah)

Sistem telah dipisahkan secara total menjadi 3 tautan (URL) mandiri dengan tampilan dan hak akses yang berbeda:

| Portal | Tautan (URL) | Deskripsi & Hak Akses |
|---|---|---|
| **Publik / Peserta** | **`/`** atau **`/daftar`** | **Landing page informasi acara & formulir pendaftaran peserta.** Tampilan bersih tanpa menu panitia/admin sehingga aman dibagikan ke publik & peserta. |
| **Panitia Presensi** | **`/panitia`** | **Portal khusus panitia pelaksana.** Dilengkapi login khusus panitia, scanner kamera QR code, input ID cepat, pencarian/filter, audio feedback, dan tambah peserta manual. |
| **Administrator** | **`/admin`** | **Portal pusat kendali super admin.** Dilengkapi login khusus admin, manajemen penuh peserta (edit/hapus), unduh laporan PDF sekolah, kelola akun panitia, manajemen acara & flyer, serta integrasi Google Spreadsheet. |

---

## 🚀 Fitur Utama

### 1. Portal Peserta (`/` & `/daftar`)
- **Landing Page Acara**: Menampilkan judul acara, tanggal, waktu, lokasi, deskripsi, dan flyer acara resmi dengan tombol **"Daftar Sekarang"**.
- **Formulir Pendaftaran**:
  - Nama Lengkap
  - Nama Panggilan
  - Asal Sekolah
  - Kelas (*Dropdown*: `X`, `XI`, `XII`, `Alumni`)
  - Email Aktif
- **Validasi Ketat**: 1 Email dan 1 Nama Lengkap hanya dapat mendaftar **1 kali**.
- **Auto-Generate ID & QR Code**: Otomatis membuat ID presensi berformat `[NoUrut]_[NamaPanggilan]` (contoh: `001_Budi`).
- **E-Tiket PDF Modern**: Tiket resmi langsung otomatis terdownload di browser dan dikirimkan ke email peserta beserta lampiran QR Code.

### 2. Portal Panitia (`/panitia`)
- **Login Khusus Panitia**: Hanya dapat diakses oleh akun panitia/petugas.
- **Scanner QR Code Kamera**: Membuka kamera laptop/smartphone untuk memindai QR Code tiket peserta secara instan.
- **Input Manual ID**: Input kode presensi langsung via keyboard / barcode reader.
- **Instant Preview & Audio Feedback**: 
  - Bunyi *chime* sukses & kartu identitas peserta muncul seketika saat presensi berhasil.
  - Bunyi *warning buzzer* jika peserta **sudah pernah absen sebelumnya** (mencegah scan ganda).
- **Live Count Kehadiran**: Menampilkan total terdaftar, total hadir, belum hadir, dan persentase kehadiran (*auto-refresh live* 5 detik).
- **Pencarian & Filter Cepat**: Cari berdasarkan nama / ID, filter asal sekolah, kelas, status kehadiran, dan urutan terbaru/terlama.
- **Tambah Peserta Manual**: Input peserta baru langsung di tempat oleh panitia.

### 3. Portal Administrator (`/admin`)
- **Login Khusus Admin**: Terproteksi ketat untuk Super Admin.
- Seluruh fitur yang ada pada Dashboard Panitia.
- **Rekapan Presensi Berdasarkan Sekolah**: Tabel live count kehadiran per sekolah dan tombol **Download Laporan PDF Resmi** siap cetak.
- **Edit & Hapus Peserta**: Perbarui atau hapus data peserta sewaktu-waktu.
- **Manajemen Pengguna (User Management)**: Tambah dan hapus akun panitia & admin baru.
- **Manajemen Acara**: Ubah judul acara, tanggal, waktu, tempat, dan unggah flyer acara langsung.
- **Auto Backup Google Spreadsheet**:
  - Konfigurasi Webhook URL Google Apps Script.
  - Tombol Tes Koneksi & Sinkronisasi Seluruh Database ke Sheet.
  - Tombol Ekspor / Download Backup Offline format `.CSV` (Microsoft Excel).
- **Pengaturan SMTP Email**: Konfigurasi kredensial email (Gmail/SMTP) untuk pengiriman PDF tiket otomatis.

---

## 🔑 Akun Default Petugas

| Role | Username | Password | Akses Link |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | `http://localhost:5000/admin` |
| **Panitia Presensi** | `panitia` | `panitia123` | `http://localhost:5000/panitia` |

---

## 💻 Cara Menjalankan Aplikasi

Pastikan Node.js (v18+) sudah terpasang di komputer Anda.

### 1. Menjalankan Server & Web (Mode Produksi):
```bash
npm start
```
Buka browser pada:
- **Peserta / Publik**: `http://localhost:5000/` atau `http://localhost:5000/daftar`
- **Panitia**: `http://localhost:5000/panitia`
- **Admin**: `http://localhost:5000/admin`

### 2. Menjalankan Mode Development:
```bash
npm run dev
```

---

## 📊 Panduan Auto Backup ke Google Spreadsheet

1. Buka [Google Sheets](https://sheets.new) baru di akun Google Anda.
2. Klik menu **Ekstensi (Extensions)** &rarr; **Apps Script**.
3. Buka Dashboard Admin (`/admin`) &rarr; Klik **Google Sheet Sync**, lalu klik **Salin Kode Script**.
4. Paste kode tersebut ke editor Google Apps Script.
5. Klik **Simpan** (ikon disket).
6. Klik tombol biru **Terapkan (Deploy)** di kanan atas &rarr; **Penerapan baru (New deployment)**.
7. Pilih jenis **Aplikasi Web (Web app)**.
8. Konfigurasi:
   - **Jalankan sebagai (Execute as)**: *Saya (Me)*
   - **Siapa yang memiliki akses (Who has access)**: *Siapa saja (Anyone)*
9. Klik **Terapkan (Deploy)** dan salin **URL Aplikasi Web**.
10. Tempel (Paste) URL tersebut pada Dashboard Admin &rarr; **Simpan URL**.
11. Selesai! Seluruh pendaftaran dan absensi akan otomatis tersinkronisasi ke Google Sheet Anda.
