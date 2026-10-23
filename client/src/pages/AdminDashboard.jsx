import React, { useState, useEffect } from 'react';
import {
  Camera,
  Search,
  Filter,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  QrCode,
  Download,
  RefreshCw,
  School,
  Calendar,
  Settings,
  Shield,
  Trash2,
  Edit3,
  Upload,
  FileSpreadsheet,
  Mail,
  Send,
  Plus
} from 'lucide-react';
import {
  getParticipants,
  getStats,
  scanParticipantCode,
  deleteParticipant,
  getEventInfo,
  updateEventInfo,
  uploadFlyer,
  getUsers,
  createUser,
  deleteUser,
  getSettings,
  updateSettings,
  testSmtp
} from '../utils/api';
import { sound } from '../utils/soundEffects';
import { downloadTicketPdf, downloadSchoolRecapPdf } from '../utils/pdfGenerator';
import QRScannerModal from '../components/QRScannerModal';
import AddParticipantModal from '../components/AddParticipantModal';
import EditParticipantModal from '../components/EditParticipantModal';
import TicketCard from '../components/TicketCard';
import SheetsConfigModal from '../components/SheetsConfigModal';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'schools' | 'event' | 'users' | 'settings'

  // Participants & Stats
  const [participants, setParticipants] = useState([]);
  const [availableSchools, setAvailableSchools] = useState([]);
  const [stats, setStats] = useState({ total: 0, attended: 0, unattended: 0, attendanceRate: 0, bySchool: [] });
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Quick ID Input & Scan Preview
  const [quickCode, setQuickCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Event Management State
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    flyer_url: ''
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

  // Users Management State
  const [usersList, setUsersList] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'panitia' });
  const [addingUser, setAddingUser] = useState(false);

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_enabled: '0'
  });
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAll();

    // Auto-refresh stats polling every 5s
    const timer = setInterval(() => {
      loadStatsOnly();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadParticipants();
  }, [search, selectedSchool, selectedGrade, selectedStatus, sortOrder]);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAll = async () => {
    await Promise.all([
      loadParticipants(),
      loadStatsOnly(),
      loadEvent(),
      loadUsersList(),
      loadSmtpSettings()
    ]);
  };

  const loadStatsOnly = async () => {
    try {
      const s = await getStats();
      setStats(s);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadParticipants = async () => {
    try {
      const data = await getParticipants({
        search,
        school: selectedSchool,
        grade: selectedGrade,
        status: selectedStatus,
        sort: sortOrder
      });
      setParticipants(data.participants || []);
      setAvailableSchools(data.availableSchools || []);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadEvent = async () => {
    try {
      const data = await getEventInfo();
      if (data.event) {
        setEventData(data.event);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadUsersList = async () => {
    try {
      const data = await getUsers();
      setUsersList(data.users || []);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadSmtpSettings = async () => {
    try {
      const data = await getSettings();
      if (data.settings) {
        setSmtpConfig(prev => ({
          ...prev,
          ...data.settings
        }));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleProcessScan = async (codeToScan) => {
    if (!codeToScan || !codeToScan.trim()) return;

    setLoadingAction(true);
    setScanResult(null);

    try {
      const res = await scanParticipantCode(codeToScan.trim());
      sound.playSuccess();
      setScanResult({
        type: 'success',
        message: res.message,
        participant: res.participant
      });
      loadAll();
      setQuickCode('');
    } catch (err) {
      sound.playWarning();
      setScanResult({
        type: 'error',
        message: err.message,
        details: err.data?.details || null,
        participant: err.data?.participant || null,
        alreadyAttended: err.data?.already_attended
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteParticipant = async (p) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus peserta "${p.full_name}" (${p.code})? Data di Google Sheet juga akan terhapus.`)) {
      return;
    }
    try {
      await deleteParticipant(p.id);
      showNotification('success', `Peserta ${p.full_name} berhasil dihapus.`);
      loadAll();
    } catch (err) {
      showNotification('error', err.message || 'Gagal menghapus peserta.');
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setSavingEvent(true);
    try {
      const res = await updateEventInfo(eventData);
      setEventData(res.event);
      showNotification('success', 'Informasi acara berhasil diperbarui!');
    } catch (err) {
      showNotification('error', err.message || 'Gagal memperbarui acara.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleFlyerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFlyer(true);
    try {
      const res = await uploadFlyer(file);
      setEventData(prev => ({ ...prev, flyer_url: res.flyer_url }));
      showNotification('success', 'Gambar flyer berhasil diunggah!');
    } catch (err) {
      showNotification('error', err.message || 'Gagal mengunggah flyer.');
    } finally {
      setUploadingFlyer(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      await createUser(newUser);
      showNotification('success', `User "${newUser.username}" berhasil ditambahkan.`);
      setNewUser({ username: '', password: '', name: '', role: 'panitia' });
      loadUsersList();
    } catch (err) {
      showNotification('error', err.message || 'Gagal menambahkan user.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Hapus akun "${u.username}"?`)) return;
    try {
      await deleteUser(u.id);
      showNotification('success', `Akun "${u.username}" berhasil dihapus.`);
      loadUsersList();
    } catch (err) {
      showNotification('error', err.message || 'Gagal menghapus user.');
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    try {
      await updateSettings(smtpConfig);
      showNotification('success', 'Pengaturan SMTP berhasil disimpan!');
    } catch (err) {
      showNotification('error', err.message || 'Gagal menyimpan SMTP.');
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailTarget) {
      alert('Masukkan email penerima tes terlebih dahulu.');
      return;
    }
    setTestingSmtp(true);
    try {
      await testSmtp({ ...smtpConfig, targetEmail: testEmailTarget });
      showNotification('success', `Email tes berhasil dikirim ke ${testEmailTarget}!`);
    } catch (err) {
      showNotification('error', err.message || 'Gagal tes kirim email.');
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Modals */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerOpen(false);
          handleProcessScan(code);
        }}
      />

      <AddParticipantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newP) => {
          loadAll();
          setSelectedTicket(newP);
        }}
      />

      <EditParticipantModal
        isOpen={!!editingParticipant}
        participant={editingParticipant}
        onClose={() => setEditingParticipant(null)}
        onSuccess={() => {
          loadAll();
          showNotification('success', 'Data peserta berhasil diperbarui.');
        }}
      />

      <TicketCard
        isOpen={!!selectedTicket}
        participant={selectedTicket}
        event={eventData}
        onClose={() => setSelectedTicket(null)}
      />

      <SheetsConfigModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Global Toast Notification */}
        {notification && (
          <div
            className={`fixed top-20 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/90 border-red-500/50 text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm font-semibold">{notification.text}</span>
          </div>
        )}

        {/* Admin Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Dashboard Administrator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Kontrol Presensi & Manajemen Acara
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Kelola seluruh peserta, cetak laporan sekolah, atur panitia, dan konfigurasi Google Spreadsheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Sheet Sync</span>
            </button>

            <button
              onClick={() => downloadSchoolRecapPdf(stats, eventData)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Rekapan PDF Sekolah</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar -mx-2 sm:mx-0 px-2 sm:px-0">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'participants'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Presensi & Peserta</span>
          </button>

          <button
            onClick={() => setActiveTab('schools')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schools'
                ? 'bg-slate-800 text-purple-400 border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Rekapan & Live Count Sekolah ({stats.bySchool?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('event')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'event'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Manajemen Acara & Flyer</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-slate-800 text-amber-400 border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Kelola Panitia & Admin ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-teal-400 border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Integrasi & Email</span>
          </button>
        </div>

        {/* TAB 1: PARTICIPANTS & PRESENSI */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            
            {/* Live Counts */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Total Terdaftar</span>
                  <span className="text-2xl font-black text-white">{stats.total}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-emerald-900/50 bg-emerald-950/10 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Hadir
                  </span>
                  <span className="text-2xl font-black text-emerald-400">{stats.attended}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-amber-400 font-medium block">Belum Hadir</span>
                  <span className="text-2xl font-black text-amber-400">{stats.unattended}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-purple-400 font-medium block">Persentase Hadir</span>
                  <span className="text-2xl font-black text-purple-400">{stats.attendanceRate}%</span>
                </div>
              </div>
            </div>

            {/* Fast Scanner & ID Input */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    Presensi Cepat / Scan ID
                  </h3>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Buka Scanner
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleProcessScan(quickCode); }} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ketik ID (cth: 001_Budi)..."
                    value={quickCode}
                    onChange={(e) => setQuickCode(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={loadingAction || !quickCode.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    Cek
                  </button>
                </form>
              </div>

              {/* Instant Scan Preview */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
                {scanResult ? (
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in ${
                      scanResult.type === 'success'
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : 'bg-red-950/30 border-red-500/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {scanResult.type === 'success' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs uppercase tracking-wider font-bold">
                          {scanResult.type === 'success' ? (
                            <span className="text-emerald-400">Presensi Berhasil Terverifikasi</span>
                          ) : (
                            <span className="text-red-400">Peringatan Presensi</span>
                          )}
                        </div>
                        {scanResult.participant ? (
                          <div className="mt-1">
                            <div className="text-base font-bold text-white">
                              {scanResult.participant.full_name} ({scanResult.participant.code})
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5">
                              {scanResult.participant.school} • Kelas {scanResult.participant.grade}
                            </div>
                            {scanResult.participant.attended_at && (
                              <div className="text-[11px] text-slate-400 mt-1">
                                Waktu: {scanResult.participant.attended_at}
                                {scanResult.participant.scanned_by && ` • Oleh: ${scanResult.participant.scanned_by}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-red-300 mt-1">{scanResult.message}</div>
                        )}
                      </div>
                    </div>

                    {scanResult.participant && (
                      <button
                        onClick={() => setSelectedTicket(scanResult.participant)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 border border-slate-700 shrink-0"
                      >
                        Lihat Tiket
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5">
                    <QrCode className="w-6 h-6 text-slate-600" />
                    <span>Preview hasil scan atau input manual akan muncul di sini secara real-time.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full sm:w-auto flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama, ID, sekolah..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Semua Sekolah</option>
                  {availableSchools.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Semua Kelas</option>
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                  <option value="Alumni">Alumni</option>
                </select>

                <div className="flex gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="attended">Hadir</option>
                    <option value="unattended">Belum Hadir</option>
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah Peserta Manual</span>
              </button>
            </div>

            {/* Participants Management Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-base">
                  Database Peserta ({participants.length})
                </h3>
                <div className="text-xs text-slate-400">
                  Total {stats.attended} Hadir • {stats.unattended} Belum Hadir
                </div>
              </div>

              <div className="sm:hidden px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>👉 Geser tabel ke samping untuk melihat detail</span>
                <span className="font-mono text-emerald-400 font-semibold">{participants.length} data</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
                      <th className="py-3 px-4">ID Peserta</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Sekolah & Kelas</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Status Presensi</th>
                      <th className="py-3 px-4 text-center">Aksi (Admin)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Tidak ada peserta yang cocok dengan filter saat ini.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {p.code}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{p.full_name}</div>
                            <div className="text-[11px] text-slate-400">Panggilan: {p.nickname}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>{p.school}</div>
                            <span className="text-[10px] font-semibold bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                              Kelas {p.grade}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                            {p.email}
                          </td>

                          <td className="py-3.5 px-4">
                            {p.attended === 1 ? (
                              <div className="inline-flex flex-col">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Hadir
                                </span>
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  {p.attended_at}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                <Clock className="w-3.5 h-3.5" />
                                Belum Hadir
                              </span>
                            )}
                          </td>

                          {/* Admin Action Buttons: Edit, Delete, Ticket Preview */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {p.attended === 0 && (
                                <button
                                  onClick={() => handleProcessScan(p.code)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                                  title="Tandai Hadir"
                                >
                                  Absen
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedTicket(p)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg"
                                title="Lihat / Download Tiket"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingParticipant(p)}
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg"
                                title="Edit Peserta"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteParticipant(p)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg"
                                title="Hapus Peserta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: REKAPAN & LIVE COUNT SEKOLAH */}
        {activeTab === 'schools' && (
          <div className="space-y-6">
            
            {/* Header with PDF Download */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <School className="w-5 h-5 text-purple-400" />
                  Rekapan Presensi Berdasarkan Sekolah
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Pantau statistik kehadiran peserta dari masing-masing sekolah secara langsung (live count).
                </p>
              </div>

              <button
                onClick={() => downloadSchoolRecapPdf(stats, eventData)}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-purple-900/40 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Laporan PDF Lengkap</span>
              </button>
            </div>

            {/* School Live Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(stats.bySchool || []).map((s, idx) => (
                <div
                  key={s.school}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <h4 className="font-bold text-white text-base leading-snug">{s.school}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {s.attendanceRate}% Hadir
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${s.attendanceRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-slate-800/60 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">Total</span>
                      <span className="text-sm font-bold text-white">{s.total}</span>
                    </div>
                    <div className="bg-emerald-950/20 p-2 rounded-xl border border-emerald-900/30">
                      <span className="text-[10px] text-emerald-400 block">Hadir</span>
                      <span className="text-sm font-bold text-emerald-400">{s.attended}</span>
                    </div>
                    <div className="bg-amber-950/20 p-2 rounded-xl border border-amber-900/30">
                      <span className="text-[10px] text-amber-400 block">Belum</span>
                      <span className="text-sm font-bold text-amber-400">{s.unattended}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!stats.bySchool || stats.bySchool.length === 0) && (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-sm">
                Belum ada data pendaftar dari sekolah mana pun.
              </div>
            )}

          </div>
        )}

        {/* TAB 3: MANAJEMEN ACARA & FLYER */}
        {activeTab === 'event' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Edit Event */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Informasi & Detail Acara
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Data ini akan ditampilkan pada Landing Page, PDF Tiket, dan Email konfirmasi.
                </p>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Judul Acara *</label>
                  <input
                    type="text"
                    required
                    value={eventData.title}
                    onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Tanggal Acara *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 25 Oktober 2026"
                      value={eventData.date}
                      onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Waktu Acara *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 08:00 - 13:00 WIB"
                      value={eventData.time}
                      onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tempat / Lokasi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Auditorium Utama & Convention Hall"
                    value={eventData.location}
                    onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Deskripsi Singkat Acara</label>
                  <textarea
                    rows={4}
                    value={eventData.description || ''}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
                >
                  {savingEvent ? 'Menyimpan...' : 'Simpan Informasi Acara'}
                </button>
              </form>
            </div>

            {/* Flyer Upload & Live Preview */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  Upload Gambar Flyer Acara
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Flyer akan ditampilkan di halaman depan (Landing Page). Format: JPG, PNG, WEBP (Maks 5MB).
                </p>
              </div>

              {/* Preview Box */}
              <div className="rounded-2xl border-2 border-dashed border-slate-700 p-3 bg-slate-950 flex flex-col items-center justify-center min-h-[280px] overflow-hidden">
                {eventData.flyer_url ? (
                  <img
                    src={eventData.flyer_url}
                    alt="Preview Flyer"
                    className="w-full max-h-[300px] object-contain rounded-xl"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-slate-500">
                    <Upload className="w-10 h-10 mx-auto text-slate-600" />
                    <p className="text-xs">Belum ada gambar flyer yang diunggah.</p>
                  </div>
                )}
              </div>

              {/* Upload Input */}
              <div>
                <label className="block w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-center text-xs font-semibold cursor-pointer transition-colors">
                  <span>{uploadingFlyer ? 'Mengunggah Gambar...' : 'Pilih File Gambar Flyer'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFlyerChange}
                    disabled={uploadingFlyer}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: KELOLA PANITIA & ADMIN */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Add User Form */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                  Tambah Akun Petugas / Admin
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Buat akun panitia untuk petugas presensi atau admin untuk kendali penuh.
                </p>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nama Petugas *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Panitia Presensi Gate 1"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="username_login"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Role / Hak Akses *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="panitia">Panitia (Scan QR & Tambah Peserta Manual)</option>
                    <option value="admin">Admin (Akses Penuh Semua Menu)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingUser}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
                >
                  {addingUser ? 'Menambahkan...' : 'Tambah Akun Petugas'}
                </button>
              </form>
            </div>

            {/* Users List Table */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">
                  Daftar Akun Terdaftar ({usersList.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
                      <th className="py-3 px-4">Nama</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">{u.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{u.username}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              u.role === 'admin'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* TAB 5: INTEGRASI SPREADSHEET & EMAIL */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Google Sheets Webhook Card */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    Auto Backup Google Spreadsheet
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Sinkronisasi otomatis setiap data pendaftar & presensi yang masuk.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">Status Webhook Google Sheet:</span>
                  <button
                    onClick={() => setIsSheetsModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Buka Konfigurasi Webhook
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tersedia panduan langkah-demi-langkah dan template kode Google Apps Script siap pakai untuk Google Sheet Anda.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => window.open('/api/participants/export/csv', '_blank')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Backup Offline (.CSV / Excel)</span>
                </button>
              </div>
            </div>

            {/* SMTP Email Settings Card */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" />
                  Pengaturan Email Pengiriman Tiket
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kirimkan PDF tiket otomatis ke email peserta setelah pendaftaran (SMTP).
                </p>
              </div>

              <form onSubmit={handleSaveSmtp} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="smtp_enabled"
                    checked={smtpConfig.smtp_enabled === '1'}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_enabled: e.target.checked ? '1' : '0' })}
                    className="w-4 h-4 text-emerald-600 bg-slate-800 rounded border-slate-700"
                  />
                  <label htmlFor="smtp_enabled" className="text-xs font-semibold text-slate-300 cursor-pointer">
                    Aktifkan Pengiriman Email Otomatis
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">SMTP Host</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={smtpConfig.smtp_host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_host: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">SMTP Port</label>
                    <input
                      type="text"
                      placeholder="587 / 465"
                      value={smtpConfig.smtp_port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">SMTP User / Email</label>
                    <input
                      type="text"
                      placeholder="panitia@gmail.com"
                      value={smtpConfig.smtp_user}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_user: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">SMTP App Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={smtpConfig.smtp_pass}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_pass: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Simpan Pengaturan SMTP
                  </button>
                </div>
              </form>

              {/* Test Email */}
              <div className="pt-2 border-t border-slate-800 flex gap-2">
                <input
                  type="email"
                  placeholder="Kirim tes ke email..."
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {testingSmtp ? 'Mengirim...' : 'Tes Kirim'}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
