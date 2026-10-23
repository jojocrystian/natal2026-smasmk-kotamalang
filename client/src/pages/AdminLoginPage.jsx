import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { login } from '../utils/api';

export default function AdminLoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      if (data.user.role !== 'admin') {
        setError('Akun Anda tidak memiliki izin Administrator. Silakan login pada portal panitia di /panitia');
        return;
      }
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username & password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        
        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-3 shadow-lg shadow-purple-900/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
              PANEL KENDALI UTAMA
            </span>
            <h2 className="text-2xl font-black text-white mt-2">Login Administrator</h2>
            <p className="text-xs text-slate-400 mt-1">
              Akses khusus untuk manajemen data peserta, cetak laporan sekolah, dan konfigurasi acara.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                Username Admin
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan username admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-purple-900/30 hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk Panel Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill Button */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block mb-2 font-medium">Uji Coba Cepat (Akun Admin):</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-mono text-purple-300 border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>Gunakan Akun: admin / admin123</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
