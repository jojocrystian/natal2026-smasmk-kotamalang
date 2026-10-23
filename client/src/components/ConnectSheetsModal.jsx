import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { getSheetsUrl, setSheetsUrl, testSheetsWebhook } from '../utils/api';

export default function ConnectSheetsModal({ isOpen, onClose }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(getSheetsUrl());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e) => {
    e.preventDefault();
    if (!url.trim() || !url.includes('script.google.com')) {
      setStatusMsg({
        type: 'error',
        text: 'URL harus berupa tautan Web App Google Apps Script (berisi script.google.com/macros/s/.../exec)'
      });
      return;
    }

    setTesting(true);
    setStatusMsg(null);

    try {
      setSheetsUrl(url.trim());
      const res = await testSheetsWebhook(url.trim());
      setStatusMsg({
        type: 'success',
        text: 'Berhasil terhubung ke Google Spreadsheet! Memuat ulang sistem...'
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal terhubung. Pastikan Web App disetel ke "Anyone" (Siapa saja).'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    setSheetsUrl('');
    setUrl('');
    setStatusMsg({ type: 'success', text: 'Koneksi Spreadsheet dihapus. Memuat ulang...' });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Hubungkan Google Spreadsheet</h3>
              <p className="text-xs text-slate-400">Gunakan Google Sheets sebagai database online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSaveAndTest} className="p-5 sm:p-6 space-y-4">
          
          {statusMsg && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              URL Web App Google Apps Script *
            </label>
            <input
              type="url"
              required
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-[11px] text-slate-400">
              Dapatkan URL ini dari menu <b>Extensions &rarr; Apps Script &rarr; Deploy &rarr; Web app (Who has access: Anyone)</b> di spreadsheet Anda.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              disabled={testing}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {testing ? 'Menguji & Menyimpan...' : 'Simpan & Hubungkan Database'}
            </button>

            {getSheetsUrl() && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
              >
                Putus Koneksi
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
