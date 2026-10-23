import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, QrCode, Sparkles, CheckCircle2 } from 'lucide-react';
import { getEventInfo } from '../utils/api';

export default function LandingPage() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      const data = await getEventInfo();
      setEvent(data.event);
    } catch (err) {
      console.warn('Failed to load event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      
      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Event Info */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Pendaftaran Acara Resmi Dibuka
            </div>

            {/* Event Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {event?.title || 'Grand Seminar & Workshop Nasional 2026'}
            </h1>

            {/* Event Description */}
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              {event?.description || 'Pastikan kehadiran Anda pada acara akbar kami. Daftarkan diri Anda secara online untuk mendapatkan tiket elektronik resmi berformat PDF dengan QR Code presensi instan.'}
            </p>

            {/* Event Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <Calendar className="w-4 h-4" />
                  Tanggal
                </div>
                <div className="text-white font-bold text-sm truncate">
                  {event?.date || '25 Oktober 2026'}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold">
                  <Clock className="w-4 h-4" />
                  Waktu
                </div>
                <div className="text-white font-bold text-sm truncate">
                  {event?.time || '08:00 - 13:00 WIB'}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1 sm:col-span-1">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <MapPin className="w-4 h-4" />
                  Lokasi
                </div>
                <div className="text-white font-bold text-sm truncate">
                  {event?.location || 'Auditorium Utama'}
                </div>
              </div>
            </div>

            {/* Call To Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                to="/daftar"
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-base shadow-xl shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all hover:scale-105 flex items-center gap-2.5"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Features check list */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap gap-4 sm:gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>1 Orang 1 Tiket QR</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Download Tiket PDF Otomatis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Kirim Tiket ke Email</span>
              </div>
            </div>

          </div>

          {/* Right Column: Event Flyer Display */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm sm:max-w-md bg-slate-900 rounded-3xl border border-slate-800 p-3 sm:p-4 shadow-2xl relative group">
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-[3/4] flex items-center justify-center relative border border-slate-800">
                {event?.flyer_url ? (
                  <img
                    src={event.flyer_url}
                    alt="Flyer Acara"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Flyer Acara Resmi</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Flyer resmi acara akan muncul di sini.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Floating badge */}
                <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white">Presensi Digital 2026</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">QR Verified</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 Sistem Registrasi & Presensi Acara Terpadu.</span>
          <span className="text-slate-600">Pastikan membawa tiket QR saat hadir di lokasi acara.</span>
        </div>
      </footer>

    </div>
  );
}
