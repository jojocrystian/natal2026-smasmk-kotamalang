import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  MapPin,
  Phone,
  Info
} from 'lucide-react';
import {
  getParticipants,
  getStats,
  scanParticipantCode,
  deleteParticipant,
  toggleAttendance,
  resendTicketEmail,
  getEventInfo,
  updateEventInfo,
  uploadFlyer,
  deleteFlyer,
  getUsers,
  createUser,
  deleteUser,
  getSettings,
  updateSettings,
  testSmtp,
  syncAllSheets,
  getCurrentUser,
  getSheetsUrl,
  broadcastEventUpdate
} from '../utils/api';
import { sound } from '../utils/soundEffects';
import { downloadTicketPdf, downloadSchoolRecapPdf } from '../utils/pdfGenerator';
import { formatIndonesianDate, formatIndonesianDateTime } from '../utils/dateFormatter';
import QRScannerModal from '../components/QRScannerModal';
import AddParticipantModal from '../components/AddParticipantModal';
import EditParticipantModal from '../components/EditParticipantModal';
import TicketCard from '../components/TicketCard';
import SheetsConfigModal from '../components/SheetsConfigModal';

export default function AdminDashboard() {
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'schools' | 'event' | 'users' | 'settings'

  // Participants & Server Stats
  const [participants, setParticipants] = useState([]);
  const [availableSchools, setAvailableSchools] = useState([]);
  const [serverStats, setServerStats] = useState({ total: 0, attended: 0, unattended: 0, attendanceRate: 0, bySchool: [] });
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination for participants
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Confirmation Modals State
  const [confirmDeleteParticipant, setConfirmDeleteParticipant] = useState(null);
  const [confirmCancelAttendance, setConfirmCancelAttendance] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Quick ID Input & Scan Preview
  const [quickCode, setQuickCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // PDF & Sync Loading States
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Event Management State
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    time: '',
    startTime: '09:00',
    endTime: '13:00',
    location: '',
    description: '',
    flyer_url: '',
    quota: 500,
    registration_status: 'open',
    maps_url: '',
    whatsapp: ''
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

  // Users Management State
  const [usersList, setUsersList] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'panitia' });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    has_smtp_pass: false,
    smtp_from: '',
    smtp_enabled: '0'
  });
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);

  // School Tab Filtering & Sorting State
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolSort, setSchoolSort] = useState('total'); // 'total' | 'rate' | 'name'

  // Notifications
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAll();

    // Auto-refresh stats polling every 6s
    const timer = setInterval(() => {
      loadStatsOnly();
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadParticipants();
    setCurrentPage(1); // Reset page on filter change
  }, [search, selectedSchool, selectedGrade, selectedStatus, sortOrder]);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4500);
  };

  // Single Source of Truth Metrics Calculation
  const computedStats = useMemo(() => {
    const total = participants.length;
    const attended = participants.filter(p => Number(p.attended) === 1).length;
    const unattended = total - attended;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    // Aggregate schools from live participants
    const schoolMap = {};
    for (const p of participants) {
      const sch = (p.school || 'Lainnya').trim();
      if (!schoolMap[sch]) {
        schoolMap[sch] = { school: sch, total: 0, attended: 0, unattended: 0, attendanceRate: 0 };
      }
      schoolMap[sch].total += 1;
      if (Number(p.attended) === 1) {
        schoolMap[sch].attended += 1;
      } else {
        schoolMap[sch].unattended += 1;
      }
    }

    let bySchool = Object.values(schoolMap).map(s => ({
      ...s,
      attendanceRate: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0
    }));

    // If local participants is currently empty or filtered, fallback to serverStats.bySchool if available
    if (bySchool.length === 0 && serverStats.bySchool && serverStats.bySchool.length > 0) {
      bySchool = serverStats.bySchool;
    }

    return {
      total: total || serverStats.total || 0,
      attended: attended || serverStats.attended || 0,
      unattended: (total || serverStats.total || 0) - (attended || serverStats.attended || 0),
      attendanceRate: total > 0 ? attendanceRate : (serverStats.attendanceRate || 0),
      bySchool
    };
  }, [participants, serverStats]);

  // Paginated Participants List
  const paginatedParticipants = useMemo(() => {
    if (pageSize === 'all') return participants;
    const size = Number(pageSize);
    const startIndex = (currentPage - 1) * size;
    return participants.slice(startIndex, startIndex + size);
  }, [participants, currentPage, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(participants.length / Number(pageSize)) || 1;

  // Filtered & Sorted Schools for Rekapan Tab
  const filteredAndSortedSchools = useMemo(() => {
    let list = [...(computedStats.bySchool || [])];

    if (schoolSearch.trim()) {
      const q = schoolSearch.trim().toLowerCase();
      list = list.filter(s => s.school.toLowerCase().includes(q));
    }

    if (schoolSort === 'rate') {
      list.sort((a, b) => b.attendanceRate - a.attendanceRate || b.total - a.total);
    } else if (schoolSort === 'name') {
      list.sort((a, b) => a.school.localeCompare(b.school));
    } else {
      // Default: Total Terbanyak
      list.sort((a, b) => b.total - a.total || b.attended - a.attended);
    }

    return list;
  }, [computedStats.bySchool, schoolSearch, schoolSort]);

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
      if (s) setServerStats(s);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const data = await getParticipants({
        search,
        school: selectedSchool,
        grade: selectedGrade,
        status: selectedStatus,
        sort: sortOrder
      });
      setParticipants(data.participants || []);
      setAvailableSchools(data.availableSchools || []);

      const liveCount = data.totalCount !== undefined ? Number(data.totalCount) : (Array.isArray(data.participants) ? data.participants.length : null);
      if (liveCount !== null && !isNaN(liveCount)) {
        const currentEv = getCachedEventInfo() || {};
        broadcastEventUpdate({
          ...currentEv,
          registered_count: liveCount
        });
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const loadEvent = async () => {
    try {
      const data = await getEventInfo();
      if (data.event) {
        const ev = data.event;
        // Parse raw date into pure YYYY-MM-DD
        let cleanDate = ev.date || '';
        const ymd = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (ymd) {
          cleanDate = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
        }

        // Parse time if format is "HH:mm - HH:mm WIB"
        let sTime = '09:00';
        let eTime = '13:00';
        if (ev.time) {
          const times = ev.time.match(/(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/);
          if (times) {
            sTime = times[1].replace('.', ':');
            eTime = times[2].replace('.', ':');
          }
        }

        setEventData({
          ...ev,
          date: cleanDate,
          startTime: sTime,
          endTime: eTime,
          quota: ev.quota !== undefined && ev.quota !== null ? Number(ev.quota) : 500,
          registration_status: ev.registration_status || 'open',
          maps_url: ev.maps_url || '',
          whatsapp: ev.whatsapp || ''
        });
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
          ...data.settings,
          has_smtp_pass: !!data.settings.has_smtp_pass
        }));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Process QR / Code Scan
  const handleProcessScan = async (codeToScan) => {
    if (!codeToScan || !codeToScan.trim()) return;

    setLoadingAction(true);
    setScanResult(null);

    try {
      const res = await scanParticipantCode(codeToScan.trim());
      sound.playSuccess();
      setScanResult({
        type: 'success',
        message: res.message || 'Presensi berhasil terverifikasi!',
        participant: res.participant
      });

      // Update in-place in participants state
      if (res.participant) {
        setParticipants(prev =>
          prev.map(p => (p.id === res.participant.id ? { ...p, attended: 1, attended_at: res.participant.attended_at, scanned_by: res.participant.scanned_by } : p))
        );
      }
      setQuickCode('');
    } catch (err) {
      sound.playWarning();
      setScanResult({
        type: 'error',
        message: err.message || 'Gagal memproses presensi.',
        details: err.data?.details || null,
        participant: err.data?.participant || null,
        alreadyAttended: err.data?.already_attended
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // Toggle or Cancel Attendance
  const handleToggleAttendance = async (participant, shouldAttend) => {
    try {
      const res = await toggleAttendance(participant.id, shouldAttend);
      sound.playSuccess();
      showNotification('success', res.message || 'Status presensi berhasil diperbarui.');

      // Update local state instantly
      setParticipants(prev =>
        prev.map(p =>
          p.id === participant.id
            ? {
                ...p,
                attended: shouldAttend ? 1 : 0,
                attended_at: shouldAttend ? new Date().toISOString() : null,
                scanned_by: shouldAttend ? (currentUser?.name || 'Admin') : null
              }
            : p
        )
      );

      // Close modal if open
      setConfirmCancelAttendance(null);
    } catch (err) {
      showNotification('error', err.message || 'Gagal memperbarui presensi.');
    }
  };

  // Delete Participant
  const executeDeleteParticipant = async () => {
    if (!confirmDeleteParticipant) return;
    const p = confirmDeleteParticipant;
    try {
      await deleteParticipant(p.id);
      showNotification('success', `Peserta "${p.full_name}" (${p.code}) berhasil dihapus.`);
      setParticipants(prev => prev.filter(item => item.id !== p.id));
      setConfirmDeleteParticipant(null);
    } catch (err) {
      showNotification('error', err.message || 'Gagal menghapus peserta.');
    }
  };

  // Resend E-Ticket Email
  const handleResendEmail = async (p) => {
    if (!window.confirm(`Kirim ulang e-tiket resmi ke email "${p.email}" milik ${p.full_name}?`)) {
      return;
    }
    try {
      showNotification('success', `Mengirim tiket ke ${p.email}...`);
      const res = await resendTicketEmail(p.id);
      showNotification('success', res.message || `Tiket berhasil dikirim ke ${p.email}!`);
    } catch (err) {
      showNotification('error', err.message || 'Gagal mengirim email tiket.');
    }
  };

  // Instant Cloud Sync for Status & Quota
  const handleQuickStatusChange = async (newStatus) => {
    setEventData(prev => ({ ...prev, registration_status: newStatus }));
    try {
      localStorage.setItem('app_registration_status', newStatus);
      const updatedPayload = {
        ...eventData,
        registration_status: newStatus
      };
      broadcastEventUpdate(updatedPayload);
      await updateEventInfo(updatedPayload);
      const statusLabel = newStatus === 'open' ? '🟢 Dibuka Resmi' : newStatus === 'upcoming' ? '🔵 Segera Dibuka' : '🔴 Ditutup';
      showNotification('success', `Status pendaftaran berhasil diubah ke: ${statusLabel} & tersinkron ke semua halaman.`);
    } catch (err) {
      console.warn('Auto-save status error:', err);
    }
  };

  const handleQuickQuotaChange = async (newQuota) => {
    const qNum = Number(newQuota);
    if (isNaN(qNum) || qNum <= 0) return;
    setEventData(prev => ({ ...prev, quota: qNum }));
    try {
      localStorage.setItem('app_quota', String(qNum));
      const updatedPayload = {
        ...eventData,
        quota: qNum
      };
      broadcastEventUpdate(updatedPayload);
      await updateEventInfo(updatedPayload);
      showNotification('success', `Kuota peserta berhasil diubah ke: ${qNum} kursi & tersinkron ke semua halaman.`);
    } catch (err) {
      console.warn('Auto-save quota error:', err);
    }
  };

  // Save Event Information
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setSavingEvent(true);
    try {
      // Build clean time string
      const formattedTime = `${eventData.startTime} - ${eventData.endTime} WIB`;
      const payload = {
        ...eventData,
        time: formattedTime
      };
      const res = await updateEventInfo(payload);
      setEventData(prev => ({ ...prev, ...(res.event || payload) }));
      showNotification('success', 'Informasi acara berhasil diperbarui & otomatis tersinkron ke halaman pendaftaran!');
    } catch (err) {
      showNotification('error', err.message || 'Gagal memperbarui acara.');
    } finally {
      setSavingEvent(false);
    }
  };

  // Flyer Handlers
  const handleFlyerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 5MB.');
      return;
    }

    setUploadingFlyer(true);
    try {
      const res = await uploadFlyer(file);
      setEventData(prev => ({ ...prev, flyer_url: res.flyer_url }));
      showNotification('success', 'Gambar flyer berhasil diperbarui & otomatis tersinkron ke halaman pendaftaran!');
    } catch (err) {
      showNotification('error', err.message || 'Gagal mengunggah flyer.');
    } finally {
      setUploadingFlyer(false);
    }
  };

  const handleDeleteFlyer = async () => {
    if (!window.confirm('Hapus gambar flyer acara saat ini?')) return;
    try {
      await deleteFlyer();
      setEventData(prev => ({ ...prev, flyer_url: '' }));
      showNotification('success', 'Gambar flyer berhasil dihapus & tersinkron ke halaman pendaftaran.');
    } catch (err) {
      showNotification('error', err.message || 'Gagal menghapus flyer.');
    }
  };


  // PDF Recap Download with User Feedback
  const handleDownloadRecapPdf = async () => {
    try {
      setDownloadingPdf(true);
      await downloadSchoolRecapPdf(computedStats, eventData);
      showNotification('success', 'Laporan PDF Rekapan Sekolah berhasil diunduh!');
    } catch (err) {
      console.error('PDF Download Error:', err);
      showNotification('error', 'Gagal membuat file PDF. Silakan periksa koneksi atau coba lagi.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Google Sheet Full Sync with Feedback
  const handleSyncSheets = async () => {
    try {
      setSyncingSheets(true);
      const res = await syncAllSheets();
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      showNotification('success', res.message || 'Sinkronisasi Google Spreadsheet berhasil!');
      loadAll();
    } catch (err) {
      showNotification('error', err.message || 'Gagal sinkronisasi ke Google Spreadsheet.');
    } finally {
      setSyncingSheets(false);
    }
  };

  // User Management
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newUser.username.trim().length < 3) {
      alert('Username minimal harus 3 karakter.');
      return;
    }
    if (newUser.password.length < 6) {
      alert('Password minimal harus 6 karakter.');
      return;
    }

    setAddingUser(true);
    try {
      await createUser(newUser);
      showNotification('success', `Akun petugas "${newUser.username}" berhasil ditambahkan.`);
      setNewUser({ username: '', password: '', name: '', role: 'panitia' });
      loadUsersList();
    } catch (err) {
      showNotification('error', err.message || 'Gagal menambahkan user.');
    } finally {
      setAddingUser(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    const u = confirmDeleteUser;

    // Guard: Prevent deleting self
    if (currentUser && currentUser.username === u.username) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
      setConfirmDeleteUser(null);
      return;
    }

    // Guard: Prevent deleting last admin
    if (u.role === 'admin') {
      const adminCount = usersList.filter(user => user.role === 'admin').length;
      if (adminCount <= 1) {
        alert('Tidak dapat menghapus Administrator terakhir. Sistem harus memiliki minimal satu akun Admin.');
        setConfirmDeleteUser(null);
        return;
      }
    }

    try {
      await deleteUser(u.id);
      showNotification('success', `Akun "${u.username}" berhasil dihapus.`);
      setConfirmDeleteUser(null);
      loadUsersList();
    } catch (err) {
      showNotification('error', err.message || 'Gagal menghapus user.');
    }
  };

  // SMTP Settings Handlers
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

  // Reset all filters in participants table
  const handleResetFilters = () => {
    setSearch('');
    setSelectedSchool('');
    setSelectedGrade('');
    setSelectedStatus('all');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  const isSheetsConnected = Boolean(getSheetsUrl());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
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
          showNotification('success', `Peserta "${newP.full_name}" berhasil didaftarkan.`);
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
        onClose={() => {
          setIsSheetsModalOpen(false);
          loadAll();
        }}
      />

      {/* Confirmation Modal: Delete Participant */}
      {confirmDeleteParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Konfirmasi Hapus Peserta</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus data peserta{' '}
                <span className="font-bold text-white">"{confirmDeleteParticipant.full_name}"</span> (ID:{' '}
                <span className="font-mono text-emerald-400 font-bold">{confirmDeleteParticipant.code}</span>)?
              </p>
              <p className="text-xs text-red-400/90 mt-2 bg-red-950/40 p-2.5 rounded-xl border border-red-900/40">
                Peringatan: Data yang dihapus tidak dapat dipulihkan dan akan disinkronkan ke Google Spreadsheet.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteParticipant(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executeDeleteParticipant}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/40 transition-colors"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Cancel Attendance */}
      {confirmCancelAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Batalkan Status Kehadiran</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Ubah status kehadiran{' '}
                <span className="font-bold text-white">"{confirmCancelAttendance.full_name}"</span> kembali menjadi{' '}
                <span className="text-amber-400 font-semibold">Belum Hadir</span>?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmCancelAttendance(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={() => handleToggleAttendance(confirmCancelAttendance, false)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-900/40 transition-colors"
              >
                Ya, Batalkan Hadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete User */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Hapus Akun Petugas</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus akun{' '}
                <span className="font-mono text-purple-400 font-bold">"{confirmDeleteUser.username}"</span> (Nama: {confirmDeleteUser.name})?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executeDeleteUser}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/40 transition-colors"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected CSV Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Unduh Backup Data Siswa (.CSV)</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                File ini memuat seluruh data registrasi peserta, termasuk email, nama lengkap, dan riwayat presensi.
              </p>
              <p className="text-xs text-slate-400 mt-2 bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Harap jaga kerahasiaan data pribadi peserta dan gunakan hanya untuk keperluan rekap panitia resmi.</span>
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  window.open('/api/participants/export/csv', '_blank');
                  showNotification('success', 'File CSV Backup sedang diunduh...');
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Lanjutkan Unduh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Global Toast Notification */}
        {notification && (
          <div
            className={`fixed top-20 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
                : 'bg-red-950/95 border-red-500/60 text-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
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
            <p className="text-sm text-slate-400 mt-0.5">
              Kelola peserta terdaftar, cetak laporan sekolah, atur panitia, dan konfigurasi Google Spreadsheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Google Sheets Sync Button */}
            <button
              onClick={handleSyncSheets}
              disabled={syncingSheets}
              title="Sinkronisasi data ke Google Spreadsheet"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet className={`w-4 h-4 text-emerald-400 ${syncingSheets ? 'animate-spin' : ''}`} />
              <span>{syncingSheets ? 'Menyinkronkan...' : 'Google Sheet Sync'}</span>
            </button>

            {/* Rekapan PDF Button */}
            <button
              onClick={handleDownloadRecapPdf}
              disabled={downloadingPdf}
              title="Unduh laporan lengkap rekapan presensi per sekolah dalam format PDF"
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {downloadingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadingPdf ? 'Memproses PDF...' : 'Rekapan PDF Sekolah'}</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs (Mobile Short Labels, Horizontal Scrollable) */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar -mx-2 sm:mx-0 px-2 sm:px-0">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'participants'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="sm:hidden">Presensi</span>
            <span className="hidden sm:inline">Presensi & Peserta</span>
          </button>

          <button
            onClick={() => setActiveTab('schools')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schools'
                ? 'bg-slate-800 text-purple-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <School className="w-4 h-4" />
            <span className="sm:hidden">Rekap ({computedStats.bySchool?.length || 0})</span>
            <span className="hidden sm:inline">Rekapan Sekolah ({computedStats.bySchool?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('event')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'event'
                ? 'bg-slate-800 text-blue-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="sm:hidden">Acara</span>
            <span className="hidden sm:inline">Detail Acara & Flyer</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="sm:hidden">Petugas ({usersList.length})</span>
            <span className="hidden sm:inline">Kelola Petugas & Admin ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="sm:hidden">Integrasi</span>
            <span className="hidden sm:inline">Integrasi & Email</span>
          </button>
        </div>

        {/* TAB 1: PRESENSI & PESERTA */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            {/* Live Count Statistics Cards (Synchronized Single Source of Truth) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-md">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Total Terdaftar</span>
                  <span className="text-2xl font-black text-white">{computedStats.total}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-emerald-900/50 bg-emerald-950/10 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-md">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Hadir
                  </span>
                  <span className="text-2xl font-black text-emerald-400">{computedStats.attended}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-md">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-amber-400 font-medium block">Belum Hadir</span>
                  <span className="text-2xl font-black text-amber-400">{computedStats.unattended}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-md">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-purple-400 font-medium block">Persentase Hadir</span>
                  <span className="text-2xl font-black text-purple-400">{computedStats.attendanceRate}%</span>
                </div>
              </div>
            </div>

            {/* Fast Scanner & Scan Result Banner with Explicit Warning Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    Presensi Cepat / Scan ID
                  </h3>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Buka Kamera Scanner
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleProcessScan(quickCode);
                  }}
                  className="flex gap-2 pt-1"
                >
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
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {loadingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Verifikasi</span>
                  </button>
                </form>
              </div>

              {/* Instant Scan Preview / Explicit Warning Card */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
                {scanResult ? (
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in ${
                      scanResult.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : 'bg-red-950/40 border-red-500/50'
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
                            <span className="text-red-400">
                              {scanResult.alreadyAttended
                                ? 'Peringatan: Scan Ganda / Tiket Sudah Digunakan'
                                : 'Peringatan Presensi Tidak Valid'}
                            </span>
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
                            {scanResult.alreadyAttended && (
                              <div className="text-xs text-red-300 mt-1.5 bg-red-950/60 p-2 rounded-lg border border-red-900/50">
                                <strong>Alasan:</strong> Tiket ini sudah pernah digunakan pada{' '}
                                <span className="font-semibold text-white">
                                  {formatIndonesianDateTime(scanResult.participant.attended_at)}
                                </span>
                                {scanResult.participant.scanned_by && ` oleh ${scanResult.participant.scanned_by}`}.
                              </div>
                            )}
                            {!scanResult.alreadyAttended && scanResult.participant.attended_at && (
                              <div className="text-xs text-slate-400 mt-1">
                                Waktu Masuk: {formatIndonesianDateTime(scanResult.participant.attended_at)}
                                {scanResult.participant.scanned_by && ` • Oleh: ${scanResult.participant.scanned_by}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-red-300 mt-1">{scanResult.message}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {scanResult.participant && (
                        <button
                          onClick={() => setSelectedTicket(scanResult.participant)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 border border-slate-700"
                        >
                          Lihat Tiket
                        </button>
                      )}
                      <button
                        onClick={() => setScanResult(null)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        title="Tutup Peringatan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-sm flex flex-col items-center justify-center gap-1.5">
                    <QrCode className="w-6 h-6 text-slate-600" />
                    <span>Preview hasil scan atau verifikasi manual akan muncul di sini secara real-time.</span>
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="">Semua Sekolah</option>
                  {availableSchools.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
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
                    className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="attended">Hadir</option>
                    <option value="unattended">Belum Hadir</option>
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {(search || selectedSchool || selectedGrade || selectedStatus !== 'all') && (
                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                    title="Reset semua filter pencarian"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Peserta Manual</span>
                </button>
              </div>
            </div>

            {/* Participants Management Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    Database Peserta ({participants.length})
                  </h3>
                  {loadingParticipants && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Tampilkan:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="all">Semua</option>
                    </select>
                  </div>
                  <span>•</span>
                  <span>
                    Total <strong className="text-emerald-400">{computedStats.attended}</strong> Hadir •{' '}
                    <strong className="text-amber-400">{computedStats.unattended}</strong> Belum Hadir
                  </span>
                </div>
              </div>

              <div className="sm:hidden px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>👉 Geser tabel ke samping untuk melihat aksi</span>
                <span className="font-mono text-emerald-400 font-semibold">{participants.length} data</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/50">
                      <th className="py-3.5 px-4">ID Peserta</th>
                      <th className="py-3.5 px-4">Nama Lengkap</th>
                      <th className="py-3.5 px-4">Sekolah & Kelas</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Status Presensi</th>
                      <th className="py-3.5 px-4 text-center">Aksi Petugas / Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {paginatedParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="w-8 h-8 text-slate-600" />
                            <span className="text-base font-semibold text-slate-300">Tidak ada peserta yang cocok</span>
                            <span className="text-xs text-slate-500">
                              Coba ubah kata kunci pencarian atau sesuaikan pilihan filter sekolah dan status.
                            </span>
                            {(search || selectedSchool || selectedGrade || selectedStatus !== 'all') && (
                              <button
                                onClick={handleResetFilters}
                                className="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
                              >
                                Reset Filter Pencarian
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedParticipants.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {p.code}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{p.full_name}</div>
                            <div className="text-xs text-slate-400">Panggilan: {p.nickname}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-200">{p.school}</div>
                            <span className="text-xs font-semibold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                              Kelas {p.grade}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                            {p.email}
                          </td>

                          <td className="py-3.5 px-4">
                            {Number(p.attended) === 1 ? (
                              <div className="inline-flex flex-col">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Hadir
                                </span>
                                <span className="text-xs text-slate-400 mt-1 font-mono">
                                  {formatIndonesianDateTime(p.attended_at)}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                <Clock className="w-3.5 h-3.5" />
                                Belum Hadir
                              </span>
                            )}
                          </td>

                          {/* Action Buttons: Tandai Hadir / Batalkan, Kirim Email, Lihat Tiket, Edit, Hapus */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {Number(p.attended) === 0 ? (
                                <button
                                  onClick={() => handleToggleAttendance(p, true)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                                  title="Tandai peserta ini hadir"
                                  aria-label="Tandai Hadir"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Tandai Hadir</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmCancelAttendance(p)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/30 rounded-lg text-xs font-medium transition-colors"
                                  title="Batalkan status kehadiran peserta ini"
                                  aria-label="Batalkan Hadir"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Batal Hadir</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleResendEmail(p)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                title="Kirim Ulang E-Tiket ke Email Peserta"
                                aria-label="Kirim Email"
                              >
                                <Mail className="w-4 h-4 text-blue-400" />
                              </button>

                              <button
                                onClick={() => setSelectedTicket(p)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                title="Lihat & Unduh File E-Tiket"
                                aria-label="Lihat Tiket"
                              >
                                <QrCode className="w-4 h-4 text-purple-400" />
                              </button>

                              <button
                                onClick={() => setEditingParticipant(p)}
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                title="Edit Biodata Peserta"
                                aria-label="Edit Peserta"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setConfirmDeleteParticipant(p)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Hapus Data Peserta"
                                aria-label="Hapus Peserta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pageSize !== 'all' && participants.length > Number(pageSize) && (
                <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400 bg-slate-950/40">
                  <div>
                    Menampilkan{' '}
                    <strong className="text-white">
                      {(currentPage - 1) * Number(pageSize) + 1} -{' '}
                      {Math.min(currentPage * Number(pageSize), participants.length)}
                    </strong>{' '}
                    dari <strong className="text-white">{participants.length}</strong> peserta
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Sebelumnya</span>
                    </button>

                    <span className="px-3 py-1 text-xs font-mono text-slate-300">
                      Halaman {currentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REKAPAN & LIVE COUNT SEKOLAH */}
        {activeTab === 'schools' && (
          <div className="space-y-6">
            {/* Header with Search, Sorting, and PDF Download */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <School className="w-5 h-5 text-purple-400" />
                  Rekapan Presensi Berdasarkan Sekolah
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Pantau statistik kehadiran peserta dari masing-masing sekolah secara langsung (live count).
                </p>
              </div>

              <button
                onClick={handleDownloadRecapPdf}
                disabled={downloadingPdf}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-purple-900/40 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{downloadingPdf ? 'Memproses PDF...' : 'Unduh Laporan PDF Lengkap'}</span>
              </button>
            </div>

            {/* School Filter & Sort Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama sekolah..."
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400">Urutkan:</span>
                <select
                  value={schoolSort}
                  onChange={(e) => setSchoolSort(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="total">Total Peserta Terbanyak</option>
                  <option value="rate">Tingkat Hadir Tertinggi</option>
                  <option value="name">Nama Sekolah (A - Z)</option>
                </select>
              </div>
            </div>

            {/* School Live Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedSchools.map((s, idx) => (
                <div
                  key={s.school}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <h4 className="font-bold text-white text-base leading-snug">{s.school}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
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
                      <span className="text-xs text-slate-400 block font-medium">Total</span>
                      <span className="text-sm font-bold text-white">{s.total}</span>
                    </div>
                    <div className="bg-emerald-950/20 p-2 rounded-xl border border-emerald-900/30">
                      <span className="text-xs text-emerald-400 block font-medium">Hadir</span>
                      <span className="text-sm font-bold text-emerald-400">{s.attended}</span>
                    </div>
                    <div className="bg-amber-950/20 p-2 rounded-xl border border-amber-900/30">
                      <span className="text-xs text-amber-400 block font-medium">Belum</span>
                      <span className="text-sm font-bold text-amber-400">{s.unattended}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAndSortedSchools.length === 0 && (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-sm">
                Tidak ada data sekolah yang cocok dengan pencarian.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DETAIL ACARA & FLYER */}
        {activeTab === 'event' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Edit Event */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    Informasi & Detail Acara
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Data ini akan ditampilkan pada Landing Page, PDF Tiket, dan Email konfirmasi.
                  </p>
                </div>

                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
                  title="Buka Landing Page di tab baru untuk preview"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Preview Landing Page</span>
                </a>
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

                {/* Date Picker & Split Times */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Tanggal Acara *</label>
                    <input
                      type="date"
                      required
                      value={eventData.date}
                      onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      Tampil: {formatIndonesianDate(eventData.date)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Jam Mulai *</label>
                    <input
                      type="time"
                      required
                      value={eventData.startTime}
                      onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Jam Selesai *</label>
                    <input
                      type="time"
                      required
                      value={eventData.endTime}
                      onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Quota & Registration Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Kuota Maksimal Peserta *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={eventData.quota}
                      onChange={(e) => setEventData({ ...eventData, quota: Number(e.target.value) })}
                      onBlur={(e) => handleQuickQuotaChange(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      Jumlah batas maksimal pendaftar (default: 500 / 1500).
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Status Pendaftaran Acara *</label>
                    <select
                      value={eventData.registration_status}
                      onChange={(e) => handleQuickStatusChange(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="open">🟢 Dibuka Resmi (Open)</option>
                      <option value="upcoming">🔵 Segera Dibuka (Upcoming)</option>
                      <option value="closed">🔴 Ditutup (Closed)</option>
                    </select>
                    <span className="text-[11px] text-emerald-400 block font-medium">
                      ⚡ Otomatis tersimpan ke database & tersinkron real-time ke halaman utama & formulir.
                    </span>
                  </div>
                </div>

                {/* Location & Google Maps URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tempat / Lokasi Gedung *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Auditorium NICC, Jl. Kolonel Sugiono No. 24, Sukun, Kota Malang"
                    value={eventData.location}
                    onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Tautan Google Maps Lokasi</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/..."
                    value={eventData.maps_url}
                    onChange={(e) => setEventData({ ...eventData, maps_url: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* WhatsApp Contact */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kontak WhatsApp Panitia</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={eventData.whatsapp}
                    onChange={(e) => setEventData({ ...eventData, whatsapp: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Deskripsi Acara</label>
                  <textarea
                    rows={3}
                    value={eventData.description || ''}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {savingEvent && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{savingEvent ? 'Menyimpan Perubahan...' : 'Simpan Informasi Acara'}</span>
                </button>
              </form>
            </div>

            {/* Flyer Upload & Live Preview */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  Gambar Flyer Acara
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Flyer akan tampil di Landing Page. Dimensi disarankan rasio 4:5 (1080x1350 px) atau 1:1, format JPG/PNG/WEBP (Maks 5MB).
                </p>
              </div>

              {/* Preview Box */}
              <div className="rounded-2xl border-2 border-dashed border-slate-700 p-3 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                {eventData.flyer_url ? (
                  <img
                    src={eventData.flyer_url}
                    alt="Preview Flyer"
                    className="w-full max-h-[340px] object-contain rounded-xl"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-slate-500">
                    <Upload className="w-10 h-10 mx-auto text-slate-600" />
                    <p className="text-sm">Belum ada gambar flyer yang diunggah.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <label className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-center text-sm font-semibold cursor-pointer transition-colors shadow-md">
                  <span>{uploadingFlyer ? 'Mengunggah Gambar...' : 'Pilih File Flyer Baru'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFlyerChange}
                    disabled={uploadingFlyer}
                    className="hidden"
                  />
                </label>

                {eventData.flyer_url && (
                  <button
                    onClick={handleDeleteFlyer}
                    className="px-4 py-3 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/30 rounded-xl text-sm font-medium transition-colors"
                    title="Hapus Flyer"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: KELOLA PETUGAS & ADMIN */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add User Form */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                  Tambah Akun Petugas / Admin
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Buat akun panitia untuk petugas presensi atau admin untuk kendali penuh dashboard.
                </p>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400">Contoh Nama Cepat:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Panitia Pintu Utama', 'Panitia Pintu Barat', 'Petugas Presensi 1'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewUser(prev => ({ ...prev, name: preset }))}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nama Petugas *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Panitia Pintu Utama"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Username Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="username_petugas"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-400 block">Minimal 3 karakter tanpa spasi.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password *</label>
                  <div className="relative">
                    <input
                      type={showNewUserPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimal 6 karakter"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showNewUserPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 block">Kombinasi huruf & angka, min. 6 karakter.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Role / Hak Akses *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="panitia">Panitia Presensi (Scan QR & Tambah Manual)</option>
                    <option value="admin">Administrator (Akses Penuh Seluruh Menu)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingUser}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingUser && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{addingUser ? 'Menambahkan...' : 'Tambah Akun Petugas'}</span>
                </button>
              </form>
            </div>

            {/* Users List Table */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-base">
                  Daftar Akun Terdaftar ({usersList.length})
                </h3>
                <span className="text-xs text-slate-400">Login aktif: {currentUser?.username || 'admin'}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/50">
                      <th className="py-3 px-4">Nama Petugas</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {usersList.map((u) => {
                      const isSelf = currentUser && currentUser.username === u.username;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                  Anda
                                </span>
                              )}
                            </div>
                          </td>
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
                              onClick={() => setConfirmDeleteUser(u)}
                              disabled={isSelf}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isSelf ? 'Anda tidak dapat menghapus akun Anda sendiri' : 'Hapus Akun'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Auto Backup Google Spreadsheet
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Sinkronisasi cloud otomatis setiap data pendaftar & presensi yang masuk.
                </p>
              </div>

              {/* Real Connection Status Indicator */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-medium block">Status Koneksi:</span>
                    {isSheetsConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Terhubung ke Google Spreadsheet
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        ○ Belum Dikonfigurasi
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setIsSheetsModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto shrink-0 shadow-md"
                  >
                    Buka Konfigurasi Webhook
                  </button>
                </div>

                {lastSyncTime && (
                  <div className="text-xs text-slate-400 pt-1">
                    Sinkronisasi terakhir: <span className="font-mono text-slate-300 font-semibold">{lastSyncTime} WIB</span>
                  </div>
                )}
              </div>

              {/* Protected Offline CSV Download */}
              <div className="pt-2">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Backup Offline (.CSV / Excel)</span>
                </button>
              </div>
            </div>

            {/* SMTP Email Settings Card */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-400" />
                    Pengaturan Email Pengiriman Tiket
                  </h3>
                  {smtpConfig.smtp_enabled === '1' ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                      Email Aktif
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-semibold">
                      Email Nonaktif
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Kirimkan PDF tiket otomatis ke email peserta setelah pendaftaran (SMTP).
                </p>
              </div>

              <form onSubmit={handleSaveSmtp} className="space-y-3">
                <div className="flex items-center gap-2 mb-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    id="smtp_enabled"
                    checked={smtpConfig.smtp_enabled === '1'}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_enabled: e.target.checked ? '1' : '0' })}
                    className="w-4 h-4 text-emerald-600 bg-slate-800 rounded border-slate-700 focus:ring-emerald-500"
                  />
                  <label htmlFor="smtp_enabled" className="text-sm font-semibold text-slate-300 cursor-pointer">
                    Aktifkan Pengiriman Email Otomatis Saat Registrasi
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">SMTP Host</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={smtpConfig.smtp_host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_host: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">SMTP Port</label>
                    <input
                      type="text"
                      placeholder="587 / 465"
                      value={smtpConfig.smtp_port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">SMTP User / Email</label>
                    <input
                      type="text"
                      placeholder="panitia@gmail.com"
                      value={smtpConfig.smtp_user}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_user: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">SMTP App Password</label>
                    <input
                      type="password"
                      placeholder={smtpConfig.has_smtp_pass ? 'Tersimpan (ketik untuk mengganti)' : 'App Password 16 digit'}
                      value={smtpConfig.smtp_pass === '********' ? '' : smtpConfig.smtp_pass}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_pass: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-md"
                  >
                    Simpan Pengaturan SMTP
                  </button>
                </div>
              </form>

              {/* Test Email */}
              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="email"
                  placeholder="Ketik email penerima tes..."
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {testingSmtp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{testingSmtp ? 'Mengirim...' : 'Tes Kirim'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
