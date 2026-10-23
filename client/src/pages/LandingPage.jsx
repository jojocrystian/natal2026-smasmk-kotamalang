import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, Clock, MapPin, ExternalLink, ArrowRight, 
  CheckCircle2, AlertCircle, RefreshCw, MessageCircle, 
  HelpCircle, Sparkles, Ticket, ShieldCheck, ChevronDown, UserCheck, Users 
} from 'lucide-react';

import { getEventInfo, getCachedEventInfo } from '../utils/api';
import { formatIndonesianDate, getRegistrationStatus } from '../utils/dateFormatter';
import CheckTicketModal from '../components/CheckTicketModal';

export default function LandingPage() {
  const [event, setEvent] = useState(() => getCachedEventInfo());
  const [loading, setLoading] = useState(() => !getCachedEventInfo());
  const [error, setError] = useState(null);
  const [showCheckTicket, setShowCheckTicket] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    loadEvent(!event);

    // Realtime Sync Listener (Same window / tab)
    const handleEventUpdate = (e) => {
      if (e.detail) {
        setEvent(e.detail);
        setLoading(false);
      }
    };
    window.addEventListener('event_info_updated', handleEventUpdate);

    // Cross-tab Storage Sync Listener
    const handleStorageUpdate = (e) => {
      if (e.key === 'cached_event_info' && e.newValue) {
        try {
          setEvent(JSON.parse(e.newValue));
          setLoading(false);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageUpdate);

    // Polling every 8 seconds to automatically catch changes from Admin or Google Sheets
    const interval = setInterval(() => {
      loadEvent(false);
    }, 8000);

    return () => {
      window.removeEventListener('event_info_updated', handleEventUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      clearInterval(interval);
    };
  }, []);

  const loadEvent = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    setError(null);
    try {
      const data = await getEventInfo();
      if (data?.event) {
        setEvent(data.event);
      }
    } catch (err) {
      console.warn('Gagal memuat data acara:', err);
      if (!event) {
        setError('Gagal memuat data acara. Periksa koneksi internet Anda.');
      }
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  const regStatus = getRegistrationStatus(event);
  const eventDateFormatted = formatIndonesianDate(event?.date || '2026-01-28');
  const eventTime = event?.time || '09:00 - 13:00 WIB';
  const eventLocation = event?.location || 'Auditorium NICC, Jl. Kolonel Sugiono No. 24, Sukun, Kota Malang';
  const mapsUrl = event?.maps_url && event.maps_url.trim().startsWith('http')
    ? event.maps_url.trim()
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventLocation)}`;

  // WhatsApp Link
  const rawWa = (event?.whatsapp || '081234567890').replace(/[^0-9]/g, '');
  const waNumber = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : (rawWa.startsWith('62') ? rawWa : '62' + rawWa);
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo Panitia ' + (event?.title || 'Natal 2026') + ', saya ingin bertanya mengenai pendaftaran')}`;


  const faqs = [
    {
      q: 'Bagaimana jika tiket PDF tidak masuk ke email saya?',
      a: 'Periksa folder Spam atau Promosi di email Anda. Anda juga dapat menggunakan tombol "Cek Tiket" di bagian atas halaman ini untuk langsung mengunduh tiket Anda tanpa menunggu email.'
    },
    {
      q: 'Apakah pendaftaran dipungut biaya?',
      a: 'Tidak. Pendaftaran dan E-Tiket Natal Bersama SMA/SMK Kota Malang 2026 ini 100% GRATIS (Free Pass) bagi seluruh pelajar yang terdaftar.'
    },
    {
      q: 'Apakah wajib membawa tiket saat hadir di acara?',
      a: 'Ya, wajib. Tunjukkan file E-Tiket PDF atau QR Code melalui ponsel Anda kepada panitia di pintu masuk untuk discan.'
    },
    {
      q: 'Bagaimana jika saya salah mengisi nama atau sekolah saat mendaftar?',
      a: 'Silakan hubungi kontak panitia melalui WhatsApp dengan menyertakan nama dan sekolah Anda. Panitia akan membantu memperbarui data tiket Anda.'
    }
  ];

  // Reusable Flyer Card Component
  const renderFlyerCard = () => (
    <div className="w-full max-w-[280px] xs:max-w-xs sm:max-w-sm lg:max-w-md bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 p-2.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 mx-auto">
      {/* Poster Image Frame */}
      <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950 aspect-[3/4] max-h-[380px] sm:max-h-none flex items-center justify-center relative border border-slate-800">
        {event?.flyer_url ? (
          <img
            src={event.flyer_url}
            alt="Poster Resmi Natal Bersama SMA dan SMK Kota Malang 2026"
            className="w-full h-full object-contain sm:object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Ticket className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base">Poster Resmi Acara</h4>
              <p className="text-xs text-slate-400 mt-1">
                Natal Bersama SMA & SMK Kota Malang 2026
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Clean Bottom Label OUTSIDE image */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-slate-300 text-[11px] sm:text-xs">Poster Resmi Acara</span>
        </div>
        <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">Natal 2026</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      
      {/* Loading Skeleton State */}
      {loading ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 w-full animate-pulse space-y-6">
          <div className="h-7 w-40 bg-slate-800 rounded-full" />
          <div className="h-10 sm:h-14 w-4/5 bg-slate-800 rounded-2xl" />
          <div className="h-16 w-full max-w-xl bg-slate-800/60 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="h-24 bg-slate-800 rounded-2xl" />
            <div className="h-24 bg-slate-800 rounded-2xl" />
            <div className="h-24 bg-slate-800 rounded-2xl" />
            <div className="h-24 bg-slate-800 rounded-2xl" />
          </div>
        </div>
      ) : error ? (
        /* Error State with Retry Button */
        <div className="max-w-md mx-auto my-auto px-4 py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Gagal Memuat Informasi Acara</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={loadEvent}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Muat Ulang</span>
          </button>
        </div>
      ) : (
        /* Main Content */
        <main className="flex-1 flex flex-col justify-center">
          
          {/* Hero Section */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Column: Event Hero Details */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                
                {/* Dynamic Status Badge */}
                <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm font-semibold tracking-wide ${regStatus.badgeColor}`}>
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                  <span>{regStatus.badgeText}</span>
                </div>

                {/* Event Title - Mobile-optimized font size */}
                <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  {event?.title || 'Natal SMA & SMK Kota Malang 2026'}
                </h1>

                {/* Event Description */}
                <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
                  {event?.description || 'Ibadah dan Perayaan Natal bersama seluruh pelajar SMA dan SMK se-Kota Malang 2026. Daftarkan diri Anda secara online untuk mendapatkan E-Tiket resmi dengan QR Code presensi instan.'}
                </p>

                {/* MOBILE FLYER: Placed right after Event Title & Description on Mobile devices */}
                <div className="block lg:hidden py-1">
                  {renderFlyerCard()}
                </div>

                {/* Event Metadata Cards (Informasi: Tanggal, Waktu, Kuota Peserta, Lokasi) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-0.5">
                  
                  {/* Card Tanggal */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-1 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 text-xs sm:text-sm font-bold">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                      <span>Tanggal</span>
                    </div>
                    <div className="text-white font-extrabold text-xs sm:text-sm leading-snug break-words mt-1">
                      {eventDateFormatted}
                    </div>
                  </div>

                  {/* Card Waktu */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-1 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 text-xs sm:text-sm font-bold">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                      <span>Waktu</span>
                    </div>
                    <div className="text-white font-extrabold text-xs sm:text-sm leading-snug mt-1">
                      {eventTime}
                    </div>
                  </div>

                  {/* Card Kuota Peserta */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-1 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 text-xs sm:text-sm font-bold">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                      <span>Kuota Peserta</span>
                    </div>
                    <div>
                      <div className="text-white font-extrabold text-xs sm:text-sm leading-snug mt-1">
                        {regStatus.quotaText}
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            regStatus.status === 'full' || regStatus.status === 'closed'
                              ? 'bg-rose-500'
                              : regStatus.status === 'almost_full'
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, regStatus.percentage)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {regStatus.status === 'full'
                          ? 'Kuota Penuh'
                          : regStatus.status === 'closed'
                          ? 'Pendaftaran Ditutup'
                          : `Sisa ${regStatus.remaining} Kursi`}
                      </div>
                    </div>
                  </div>

                  {/* Card Lokasi */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-1 shadow-sm">
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 text-xs sm:text-sm font-bold">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                        <span>Lokasi</span>
                      </div>
                      <div className="text-white font-extrabold text-xs sm:text-sm leading-snug break-words mt-1">
                        {eventLocation}
                      </div>
                    </div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emerald-400 hover:text-emerald-300 mt-2 transition-colors group"
                      aria-label="Buka lokasi acara di Google Maps"
                    >
                      <span>Buka Maps</span>
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>

                </div>

                {/* Call To Action Buttons - Full width on Mobile */}
                <div className="pt-2 space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4 w-full">
                    {regStatus.canRegister ? (
                      <Link
                        to="/daftar"
                        className="min-h-[46px] sm:min-h-[50px] px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none w-full sm:w-auto"
                      >
                        <span>{regStatus.buttonText}</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="min-h-[46px] sm:min-h-[50px] px-8 py-3 bg-slate-800 text-slate-400 border border-slate-700/80 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base cursor-not-allowed flex items-center justify-center gap-2 opacity-80 w-full sm:w-auto"
                      >
                        <span>{regStatus.buttonText}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowCheckTicket(true)}
                      className="min-h-[46px] sm:min-h-[50px] px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none cursor-pointer w-full sm:w-auto"
                    >
                      <Ticket className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span>Cek Tiket Saya</span>
                    </button>
                  </div>

                  {!regStatus.canRegister && (
                    <p className="text-xs text-amber-400/90 font-medium">
                      {regStatus.status === 'upcoming'
                        ? 'ℹ️ Pendaftaran belum dibuka oleh panitia. Pantau terus halaman ini.'
                        : regStatus.status === 'full'
                        ? 'ℹ️ Kuota pendaftaran telah mencapai batas maksimal.'
                        : 'ℹ️ Pendaftaran telah ditutup oleh panitia.'}
                    </p>
                  )}
                </div>

                {/* High Contrast Notice Box */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Penting:</strong> Tiket resmi berformat PDF & QR Code akan otomatis terunduh di ponsel Anda dan dikirimkan ke email. Tunjukkan tiket tersebut saat tiba di lokasi acara.
                  </span>
                </div>

                {/* Features Checklist - Mobile Clean Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 pt-1 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-slate-800/60 sm:border-none">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>1 Pelajar 1 E-Tiket QR</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-slate-800/60 sm:border-none">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>Download PDF Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-slate-800/60 sm:border-none">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>Kirim Tiket ke Email</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Event Poster Display (Desktop only) */}
              <div className="hidden lg:flex lg:col-span-5 justify-center pt-2 lg:pt-0">
                {renderFlyerCard()}
              </div>

            </div>
          </section>

          {/* Section: Ketentuan & Dress Code Peserta */}
          <section className="border-t border-slate-900 bg-slate-950/60 py-8 sm:py-14">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
              
              <div className="text-center space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                  <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  <span>Ketentuan & Dress Code Peserta</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                  Persiapkan kehadiran Anda dengan menyimak ketentuan dan panduan peserta berikut ini.
                </p>
              </div>

              {/* Ketentuan Peserta Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xl">
                <ul className="space-y-3.5 sm:space-y-4 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Sasaran Peserta:</strong> Terbuka untuk seluruh siswa/i Kristen dan Katolik SMA & SMK se-Kota Malang serta guru pendamping.</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Dress Code:</strong> Pakaian Bebas Rapi & Sopan bertema Natal (Nuansa Merah / Putih / Hijau / Hitam / Batik).</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Tiket Masuk:</strong> Wajib membawa E-Tiket resmi (file PDF atau tangkapan layar QR Code) yang dapat diunduh di website ini.</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Waktu Kehadiran:</strong> Dimohon hadir tepat waktu pukul 08.00 WIB untuk registrasi dan presensi QR di meja pintu masuk.</span>
                  </li>
                </ul>
              </div>

            </div>
          </section>

          {/* Section: FAQ & Bantuan Panitia */}
          <section className="border-t border-slate-900 py-8 sm:py-14">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
              
              <div className="text-center space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  <span>Pertanyaan Umum (FAQ)</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Jawaban atas hal-hal yang sering ditanyakan oleh peserta.
                </p>
              </div>

              {/* Accordion FAQ - Mobile-optimized font and padding */}
              <div className="space-y-2.5 sm:space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div 
                      key={index} 
                      className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full p-3.5 sm:p-5 text-left font-bold text-xs sm:text-base text-white flex items-center justify-between gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                      >
                        <span className="leading-snug">{faq.q}</span>
                        <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-2.5">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* WhatsApp Contact Box */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 shadow-xl">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    Butuh Bantuan Panitia?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Jika Anda mengalami kendala pendaftaran atau salah input data, hubungi panitia melalui WhatsApp.
                  </p>
                </div>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all hover:scale-105 shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat WhatsApp Panitia</span>
                </a>
              </div>

            </div>
          </section>

        </main>
      )}

      {/* Footer - Mobile Safe Area & Compact Spacing */}
      <footer className="border-t border-slate-900 py-5 pb-8 sm:pb-6 text-xs bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <span className="text-slate-400 font-medium text-[11px] sm:text-xs">
            &copy; 2026 Panitia Natal Bersama SMA & SMK Kota Malang • Powered by <span className="text-slate-300 font-mono">EventPass</span>
          </span>
          <span className="text-slate-300 font-semibold text-[11px] sm:text-xs flex items-center gap-1.5 justify-center">
            <Ticket className="w-3.5 h-3.5 text-emerald-400 inline" />
            Tunjukkan E-Tiket PDF saat hadir di lokasi acara
          </span>
        </div>
      </footer>

      {/* Check Ticket Modal */}
      <CheckTicketModal
        isOpen={showCheckTicket}
        onClose={() => setShowCheckTicket(false)}
      />

    </div>
  );
}
