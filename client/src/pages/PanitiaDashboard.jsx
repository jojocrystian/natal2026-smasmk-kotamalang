import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUpDown
} from 'lucide-react';
import {
  getParticipants,
  getStats,
  scanParticipantCode,
  getEventInfo
} from '../utils/api';
import { sound } from '../utils/soundEffects';
import { downloadTicketPdf } from '../utils/pdfGenerator';
import QRScannerModal from '../components/QRScannerModal';
import AddParticipantModal from '../components/AddParticipantModal';
import TicketCard from '../components/TicketCard';

export default function PanitiaDashboard() {
  const [participants, setParticipants] = useState([]);
  const [availableSchools, setAvailableSchools] = useState([]);
  const [stats, setStats] = useState({ total: 0, attended: 0, unattended: 0, attendanceRate: 0 });
  const [event, setEvent] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Scanner & Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Quick ID Input
  const [quickCode, setQuickCode] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Instant Scanned Preview
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    loadData();
    getEventInfo().then(d => setEvent(d.event)).catch(() => {});

    // Polling live count every 5 seconds
    const interval = setInterval(() => {
      loadStatsOnly();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadParticipants();
  }, [search, selectedSchool, selectedGrade, selectedStatus, sortOrder]);

  const loadData = async () => {
    await Promise.all([loadParticipants(), loadStatsOnly()]);
  };

  const loadStatsOnly = async () => {
    try {
      const s = await getStats();
      setStats(s);
    } catch (e) {
      console.warn('Failed to load stats:', e);
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
      console.warn('Failed to load participants:', e);
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
      loadData();
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

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    handleProcessScan(quickCode);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerOpen(false);
          handleProcessScan(code);
        }}
      />

      {/* Manual Add Modal */}
      <AddParticipantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newP) => {
          loadData();
          setSelectedTicket(newP);
        }}
      />

      {/* Ticket Card Preview Modal */}
      <TicketCard
        isOpen={!!selectedTicket}
        participant={selectedTicket}
        event={event}
        onClose={() => setSelectedTicket(null)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header & Fast Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Dashboard Panitia Presensi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Pusat Presensi & Validasi
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Scan barcode / QR Code tiket peserta atau masukkan ID peserta secara langsung.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full sm:w-auto justify-center px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-900/40 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Buka Kamera Scanner</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto justify-center px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl font-medium text-sm transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Tambah Peserta</span>
            </button>
          </div>
        </div>

        {/* Live Count Statistics */}
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
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-blue-400 font-medium block">Persentase Hadir</span>
              <span className="text-2xl font-black text-blue-400">{stats.attendanceRate}%</span>
            </div>
          </div>
        </div>

        {/* Input ID Box & Instant Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Input ID Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Input ID / Kode Tiket Cepat
            </h3>
            <p className="text-xs text-slate-400">
              Ketik kode ID peserta (contoh: <span className="font-mono text-emerald-400">001_Budi</span>) dan tekan Enter.
            </p>
            <form onSubmit={handleQuickSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="001_Budi..."
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono font-bold"
              />
              <button
                type="submit"
                disabled={loadingAction || !quickCode.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loadingAction ? 'Cek...' : 'Validasi'}
              </button>
            </form>
          </div>

          {/* Right: Last Scanned Preview */}
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
                <span>Belum ada data scan terakhir. Gunakan kamera atau masukkan ID untuk memvalidasi presensi.</span>
              </div>
            )}
          </div>

        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, ID, sekolah, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* School Filter */}
            <div>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Semua Sekolah</option>
                {availableSchools.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Semua Kelas</option>
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
                <option value="Alumni">Alumni</option>
              </select>
            </div>

            {/* Status & Sort */}
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="attended">Hadir</option>
                <option value="unattended">Belum Hadir</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>

          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-base">
              Daftar Peserta Terdaftar ({participants.length})
            </h3>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="sm:hidden px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>👉 Geser tabel ke samping untuk melihat detail</span>
            <span className="font-mono text-emerald-400 font-semibold">{participants.length} data</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4">ID Peserta</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Sekolah & Kelas</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status Presensi</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Tidak ada peserta yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* ID Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {p.code}
                      </td>

                      {/* Full Name & Nickname */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{p.full_name}</div>
                        <div className="text-[11px] text-slate-400">Panggilan: {p.nickname}</div>
                      </td>

                      {/* School & Grade */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200">{p.school}</div>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                          Kelas {p.grade}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {p.email}
                      </td>

                      {/* Attendance Status */}
                      <td className="py-3.5 px-4">
                        {p.attended === 1 ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Hadir
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1">
                              {p.attended_at}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            <Clock className="w-3.5 h-3.5" />
                            Belum Hadir
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {p.attended === 0 && (
                            <button
                              onClick={() => handleProcessScan(p.code)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                              title="Tandai Hadir"
                            >
                              Presensi
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTicket(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="Lihat / Unduh Tiket"
                          >
                            <QrCode className="w-4 h-4" />
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

    </div>
  );
}
