import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { getCurrentUser, clearAuth } from '../utils/api';

export default function AdminNavbar({ onLogout }) {
  const user = getCurrentUser();

  const handleLogout = () => {
    clearAuth();
    if (onLogout) onLogout();
  };

  return (
    <header className="bg-slate-900 border-b border-purple-900/40 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-base tracking-wide flex items-center gap-2">
              EventPass <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">ADMIN PANEL</span>
            </div>
            <div className="text-xs text-slate-400">Pusat Kendali & Pengaturan Acara</div>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <div className="text-left">
              <div className="text-xs font-bold text-white leading-none">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] text-purple-300 font-semibold mt-0.5">Super Administrator</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Keluar dari Panel Admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-red-400 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>

      </div>
    </header>
  );
}
