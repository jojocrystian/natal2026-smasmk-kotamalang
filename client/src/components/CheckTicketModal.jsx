import React, { useState } from 'react';
import { Search, X, Ticket, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { checkTicket } from '../utils/api';
import TicketCard from './TicketCard';

export default function CheckTicketModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundTicket, setFoundTicket] = useState(null);
  const [eventData, setEventData] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setFoundTicket(null);

    if (!query.trim()) {
      setError('Masukkan email, kode tiket (misal: 001_Budi), atau nama lengkap Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await checkTicket(query.trim());
      if (res && res.participant) {
        setFoundTicket(res.participant);
        setEventData(res.event);
      } else {
        setError('Tiket tidak ditemukan. Pastikan data yang dimasukkan sama persis saat mendaftar.');
      }
    } catch (err) {
      setError(err.message || 'Tiket tidak ditemukan. Periksa kembali email atau kode Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setError('');
    setFoundTicket(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative text-slate-100">
          
          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Tutup modal"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors focus:ring-2 focus:ring-emerald-400"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cek / Unduh Ulang Tiket</h3>
              <p className="text-xs text-slate-400">Temukan e-tiket & QR Code presensi Anda</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="search-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email / Kode Tiket / Nama Lengkap
              </label>
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  required
                  placeholder="Contoh: budi@gmail.com atau 001_Budi"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Mencari Tiket...' : 'Cari Tiket Saya'}</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
            Punya kendala pendaftaran? Hubungi panitia melalui kontak WhatsApp di beranda.
          </div>

        </div>
      </div>

      {/* When ticket found, open the TicketCard */}
      {foundTicket && (
        <TicketCard
          isOpen={Boolean(foundTicket)}
          participant={foundTicket}
          event={eventData}
          onClose={() => setFoundTicket(null)}
        />
      )}
    </>
  );
}
