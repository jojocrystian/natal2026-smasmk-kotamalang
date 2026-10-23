import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { User, School, Mail, ArrowLeft, Send, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { registerParticipant, getEventInfo } from '../utils/api';
import { downloadTicketPdf } from '../utils/pdfGenerator';
import TicketCard from '../components/TicketCard';

export default function RegisterPage() {
  const [event, setEvent] = useState(null);
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
    getEventInfo().then(data => setEvent(data.event)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      
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
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs sm:text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Informasi Acara</span>
        </Link>

        {/* Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Form Header */}
          <div className="mb-6 space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Pendaftaran Peserta Acara
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Formulir Registrasi
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Isi data diri Anda dengan benar. Tiket PDF & QR Code akan otomatis tergenerate dan terdownload.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-red-400 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan nama lengkap sesuai identitas"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Nama Panggilan & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nama Panggilan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <span className="text-[11px] text-slate-500">ID Tiket: [No_NamaPanggilan]</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Kelas *
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                  <option value="Alumni">Alumni</option>
                </select>
              </div>
            </div>

            {/* Asal Sekolah */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-400" />
                Asal Sekolah *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: SMA Negeri 1 Jakarta / SMK 2 Surabaya"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Email Aktif *
              </label>
              <input
                type="email"
                required
                placeholder="email.aktif@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <span className="text-[11px] text-slate-500">
                PDF Tiket & QR Code presensi akan dikirimkan ke email ini.
              </span>
            </div>

            {/* Terms notice */}
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Ketentuan Pendaftaran:
              </div>
              <div>• 1 Email dan Nama hanya berlaku untuk 1 kali pendaftaran dan 1 kali scan presensi.</div>
              <div>• PDF Tiket akan otomatis terdownload pada website setelah menekan tombol daftar.</div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm sm:text-base shadow-xl shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Memproses Pendaftaran & Tiket...' : 'Daftar & Unduh Tiket QR'}</span>
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}
