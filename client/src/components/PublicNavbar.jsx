import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function PublicNavbar() {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link 
          to="/"
          className="flex items-center gap-2.5 sm:gap-3 select-none group focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none rounded-xl"
          aria-label="Kembali ke Beranda Natal SMA/SMK Malang 2026"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
              <span>Natal SMA/SMK Malang</span>
              <span className="text-[10px] sm:text-[11px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                2026
              </span>
            </div>
            <div className="hidden sm:block text-[11px] text-slate-400">
              Portal Resmi Pendaftaran & Presensi
            </div>
          </div>
        </Link>

      </div>
    </header>
  );
}
