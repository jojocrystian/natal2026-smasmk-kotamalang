import React from 'react';
import { QrCode, LogOut, ShieldCheck, UserCheck, Calendar, UserPlus, Home } from 'lucide-react';
import { getCurrentUser, clearAuth } from '../utils/api';

export default function Navbar({ currentView, setView }) {
  const user = getCurrentUser();

  const handleLogout = () => {
    clearAuth();
    setView('landing');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div 
          onClick={() => setView('landing')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-base tracking-wide flex items-center gap-2">
              EventPass <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-normal">v1.0</span>
            </div>
            <div className="text-xs text-slate-400">Registrasi & Presensi Terpadu</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setView('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'landing'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Beranda</span>
          </button>

          <button
            onClick={() => setView('register')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'register'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftar Peserta</span>
          </button>

          {user && (
            <>
              {/* Panitia Dashboard button */}
              <button
                onClick={() => setView('panitia')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  currentView === 'panitia'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-400 hover:bg-blue-500/10'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Panitia</span>
              </button>

              {/* Admin Dashboard button */}
              {user.role === 'admin' && (
                <button
                  onClick={() => setView('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    currentView === 'admin'
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-400 hover:bg-purple-500/10'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
            </>
          )}

          {/* User Auth controls */}
          <div className="h-5 w-px bg-slate-800 mx-1" />

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <span className="text-[10px] text-emerald-400 capitalize">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Login Petugas</span>
            </button>
          )}

        </nav>

      </div>
    </header>
  );
}
