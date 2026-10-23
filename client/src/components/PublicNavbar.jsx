import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, UserPlus, Home, Search, Ticket } from 'lucide-react';
import CheckTicketModal from './CheckTicketModal';

export default function PublicNavbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isDaftar = location.pathname === '/daftar' || location.pathname === '/register';
  const [showCheckTicket, setShowCheckTicket] = useState(false);

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
        {/* Same max-w-6xl and padding as the main hero container */}
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2">
          
          {/* Brand - Mobile Friendly & Responsive */}
          <Link 
            to="/"
            className="flex items-center gap-2 sm:gap-3 select-none group focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none rounded-xl min-w-0"
            aria-label="Kembali ke Beranda Natal SMA/SMK Malang 2026"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span className="truncate">Natal SMA/SMK</span>
                <span className="hidden md:inline"> Malang</span>
                <span className="text-[10px] sm:text-[11px] bg-emerald-500/20 text-emerald-400 px-1 sm:px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                  2026
                </span>
              </div>
              <div className="hidden sm:block text-[11px] text-slate-400 truncate">
                Portal Resmi Pendaftaran & Presensi
              </div>
            </div>
          </Link>

          {/* Navigation Action Buttons - Comfortable Touch Targets */}
          <nav className="flex items-center gap-1.5 sm:gap-3 shrink-0" aria-label="Menu Navigasi">
            
            {/* Cek Tiket Button */}
            <button
              onClick={() => setShowCheckTicket(true)}
              className="min-h-[38px] sm:min-h-[44px] flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
              aria-label="Cek dan unduh ulang tiket"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" aria-hidden="true" />
              <span className="hidden sm:inline">Cek Tiket</span>
              <span className="sm:hidden text-xs">Cek</span>
            </button>

            {/* Beranda button only shown on non-home pages */}
            {!isHome && (
              <Link
                to="/"
                className="hidden sm:flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>Beranda</span>
              </Link>
            )}

            {/* Primary Action Button: Daftar */}
            <Link
              to="/daftar"
              className={`min-h-[38px] sm:min-h-[44px] flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                isDaftar
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Daftar Sekarang</span>
              <span className="sm:hidden text-xs">Daftar</span>
            </Link>

          </nav>

        </div>
      </header>

      {/* Check Ticket Modal */}
      <CheckTicketModal
        isOpen={showCheckTicket}
        onClose={() => setShowCheckTicket(false)}
      />
    </>
  );
}
