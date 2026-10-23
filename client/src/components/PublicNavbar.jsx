import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { QrCode, UserPlus, Home } from 'lucide-react';

export default function PublicNavbar() {
  const location = useLocation();
  const isDaftar = location.pathname === '/daftar' || location.pathname === '/register';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link 
          to="/"
          className="flex items-center gap-3 select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-base tracking-wide flex items-center gap-2">
              EventPass <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-normal">2026</span>
            </div>
            <div className="text-xs text-slate-400">Portal Pendaftaran Peserta</div>
          </div>
        </Link>

        {/* Public Navigation */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              !isDaftar
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>

          <Link
            to="/daftar"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isDaftar
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-emerald-600/90 hover:bg-emerald-600 text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftar Sekarang</span>
          </Link>
        </nav>

      </div>
    </header>
  );
}
