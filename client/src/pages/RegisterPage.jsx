import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  User, School, Mail, ArrowLeft, Send, AlertCircle, Sparkles, Lock 
} from 'lucide-react';
import { registerParticipant, getEventInfo, getCachedEventInfo } from '../utils/api';
import { getRegistrationStatus } from '../utils/dateFormatter';
import { downloadTicketPdf } from '../utils/pdfGenerator';
import TicketCard from '../components/TicketCard';

export default function RegisterPage() {
  const [event, setEvent] = useState(() => getCachedEventInfo());
  const [formData, setFormData] = useState({
    full_name: '',
    nickname: '',
    school: '',
    grade: 'X',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredParticipant, setRegisteredParticipant] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    // Initial fetch
    getEventInfo().then(data => {
      if (data?.event) setEvent(data.event);
    }).catch(() => {});

    // Realtime Sync Listener (Same window / tab)
    const handleEventUpdate = (e) => {
      if (e.detail) {
        setEvent(e.detail);
      }
    };
    window.addEventListener('event_info_updated', handleEventUpdate);

    // Cross-tab Storage Sync Listener
    const handleStorageUpdate = (e) => {
      if (e.key === 'cached_event_info' && e.newValue) {
        try {
          setEvent(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageUpdate);

    // Polling every 8 seconds
    const interval = setInterval(() => {
      getEventInfo().then(data => {
        if (data?.event) setEvent(data.event);
      }).catch(() => {});
    }, 8000);

    return () => {
      window.removeEventListener('event_info_updated', handleEventUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      clearInterval(interval);
    };
  }, []);

  const regStatus = getRegistrationStatus(event);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!regStatus.canRegister) {
      setError('Maaf, pendaftaran saat ini sedang ditutup atau kuota telah penuh.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await registerParticipant(formData);
      const participant = res.participant;
      const eventData = res.event || event;

      setRegisteredParticipant(participant);

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (ce) {}

      // Automatically download PDF ticket on the website
      setTimeout(() => {
        downloadTicketPdf(participant, eventData);
      }, 600);

      // Open ticket card modal
      setShowTicketModal(true);

      // Clear form
      setFormData({
        full_name: '',
        nickname: '',
        school: '',
        grade: 'X',
        email: ''
      });
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center selection:bg-emerald-500 selection:text-white">
      
      {/* Modal E-Tiket Preview */}
      <TicketCard
        isOpen={showTicketModal}
        participant={registeredParticipant}
        event={event}
        onClose={() => setShowTicketModal(false)}
      />

      <div className="w-full max-w-xl">
        
        {/* Back Link to Landing Page */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs sm:text-sm font-semibold mb-6 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none rounded-lg p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Informasi Acara</span>
        </Link>

        {/* Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Form Header */}
          <div className="mb-5 space-y-1.5 text-center sm:text-left">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-1 border ${regStatus.badgeColor}`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{regStatus.badgeText}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Formulir Pendaftaran
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Isi data diri Anda dengan benar. Tiket resmi berformat PDF & QR Code akan otomatis tergenerate.
            </p>
          </div>

          {/* If Registration is Closed or Full */}
          {!regStatus.canRegister && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-rose-300">
              <Lock className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong>Pendaftaran Tidak Tersedia:</strong>{' '}
                {regStatus.status === 'upcoming'
                  ? `Pendaftaran untuk acara "${event?.title || 'ini'}" saat ini belum dibuka. Silakan tunggu jadwal pembukaan resmi.`
                  : `Saat ini pendaftaran untuk "${event?.title || 'ini'}" telah ditutup atau kuota peserta (${event?.registered_count || 0}/${event?.quota || 500}) telah terpenuhi.`}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-rose-400 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label htmlFor="reg-fullname" className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Nama Lengkap *
              </label>
              <input
                id="reg-fullname"
                type="text"
                required
                disabled={!regStatus.canRegister}
                placeholder="Masukkan nama lengkap sesuai kartu pelajar"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full min-h-[44px] bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              />
            </div>

            {/* Nama Panggilan & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="reg-nickname" className="text-xs sm:text-sm font-semibold text-slate-200">
                  Nama Panggilan *
                </label>
                <input
                  id="reg-nickname"
                  type="text"
                  required
                  disabled={!regStatus.canRegister}
                  placeholder="Contoh: Budi"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full min-h-[44px] bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                />
                <span className="text-[11px] text-slate-400">Digunakan untuk kode tiket: [No_NamaPanggilan]</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-grade" className="text-xs sm:text-sm font-semibold text-slate-200">
                  Tingkat Kelas *
                </label>
                <select
                  id="reg-grade"
                  disabled={!regStatus.canRegister}
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full min-h-[44px] bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                >
                  <option value="X">Kelas X (Sepuluh)</option>
                  <option value="XI">Kelas XI (Sebelas)</option>
                  <option value="XII">Kelas XII (Dua Belas)</option>
                  <option value="Alumni">Alumni / Guru Pendamping</option>
                </select>
              </div>
            </div>

            {/* Asal Sekolah */}
            <div className="space-y-1.5">
              <label htmlFor="reg-school" className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-400" />
                Asal Sekolah SMA / SMK *
              </label>
              <input
                id="reg-school"
                type="text"
                required
                disabled={!regStatus.canRegister}
                placeholder="Contoh: SMAN 1 Malang / SMKN 4 Malang"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                className="w-full min-h-[44px] bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Email Aktif *
              </label>
              <input
                id="reg-email"
                type="email"
                required
                disabled={!regStatus.canRegister}
                placeholder="email.aktif@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full min-h-[44px] bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-400">
                E-Tiket PDF resmi dan QR Code presensi akan dikirimkan juga ke email ini.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !regStatus.canRegister}
              className="w-full min-h-[48px] py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm sm:text-base shadow-xl shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
            >
              <Send className="w-4 h-4" />
              <span>
                {loading 
                  ? 'Memproses Pendaftaran & Tiket...' 
                  : !regStatus.canRegister 
                    ? 'Pendaftaran Ditutup' 
                    : 'Daftar & Unduh Tiket QR'}
              </span>
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}
