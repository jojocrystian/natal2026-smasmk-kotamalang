import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { login } from '../utils/api';

export default function LoginPage({ setView }) {
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
      if (data.user.role === 'admin') {
        setView('admin');
      } else {
        setView('panitia');
      }
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username & password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      
      <div className="w-full max-w-md">
        
        {/* Back Link */}
        <button
          onClick={() => setView('landing')}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs sm:text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-white">Login Petugas</h2>
            <p className="text-xs text-slate-400 mt-1">
              Masuk untuk mengakses dashboard scanner panitia atau dashboard admin.
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
                <User className="w-3.5 h-3.5 text-slate-400" />
                Username
              </label>
              <input
                type="text"
                required
                placeholder="admin / panitia"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-900/30 hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block mb-2 font-medium">Akun Demo Default:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono text-purple-300 border border-slate-700 transition-colors"
              >
                admin / admin123
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('panitia', 'panitia123')}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono text-blue-300 border border-slate-700 transition-colors"
              >
                panitia / panitia123
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
