import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Check, Copy, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { getSettings, updateSettings, testSheetsWebhook, syncAllSheets } from '../utils/api';

export default function SheetsConfigModal({ isOpen, onClose }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [appsScriptCode, setAppsScriptCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setWebhookUrl(data.settings?.google_sheets_webhook_url || '');
      setAppsScriptCode(data.appsScriptCode || '');
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      await updateSettings({ google_sheets_webhook_url: webhookUrl });
      setStatusMsg({ type: 'success', text: 'URL Webhook Google Sheets berhasil disimpan!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal menyimpan URL Webhook.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await testSheetsWebhook(webhookUrl);
      setStatusMsg({ type: 'success', text: res.message || 'Tes koneksi berhasil terhubung ke Google Spreadsheet!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal terhubung ke Google Sheets.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await syncAllSheets();
      setStatusMsg({ type: 'success', text: res.message || 'Seluruh database berhasil dicadangkan ke Google Sheet!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal sinkronisasi ke Google Sheet.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyCode = () => {
    if (appsScriptCode) {
      navigator.clipboard.writeText(appsScriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCsv = () => {
    window.open('/api/participants/export/csv', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">Pengaturan Auto Backup Google Spreadsheet</h3>
              <p className="text-xs text-slate-400">Sinkronisasi otomatis setiap registrasi & presensi masuk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Notification */}
          {statusMsg && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Webhook Configuration Section */}
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              URL Webhook Google Apps Script
            </h4>
            <div className="space-y-1.5">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Setiap kali peserta mendaftar atau absen, data akan otomatis terkirim dan tersimpan di Google Sheet Anda.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan URL'}
              </button>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !webhookUrl}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Menguji...' : 'Tes Koneksi'}
              </button>

              <button
                type="button"
                onClick={handleSyncAll}
                disabled={syncing || !webhookUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 ml-auto"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {syncing ? 'Sinkronisasi...' : 'Cadangkan Semua ke Sheet'}
              </button>
            </div>
          </div>

          {/* Quick CSV Export */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-white text-xs sm:text-sm">Cadangan Offline (CSV Excel)</h5>
              <p className="text-xs text-slate-400">Unduh seluruh database peserta dalam format file .CSV langsung ke komputer.</p>
            </div>
            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Download CSV
            </button>
          </div>

          {/* Tutorial & Script Code */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white text-sm">Langkah Setup Google Apps Script (1 Menit):</h4>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin Kode Script'}
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <li>Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Google Sheets Baru</a>.</li>
              <li>Klik menu <b>Ekstensi (Extensions)</b> &rarr; <b>Apps Script</b>.</li>
              <li>Hapus semua teks yang ada di editor, lalu paste kode di bawah.</li>
              <li>Klik <b>Simpan</b> (ikon disket).</li>
              <li>Klik tombol <b>Terapkan (Deploy)</b> di kanan atas &rarr; pilih <b>Penerapan baru (New deployment)</b>.</li>
              <li>Pilih jenis ikon gerigi &rarr; <b>Aplikasi Web (Web app)</b>.</li>
              <li>Pada bagian <i>"Siapa yang memiliki akses (Who has access)"</i>, pilih <b>Siapa saja (Anyone)</b>.</li>
              <li>Klik <b>Terapkan (Deploy)</b> dan salin <b>URL Aplikasi Web</b> yang diberikan.</li>
              <li>Paste URL tersebut pada kolom input di atas dan klik <b>Simpan URL</b>.</li>
            </ol>

            {/* Code Box */}
            <div className="relative">
              <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto border border-slate-800 whitespace-pre-wrap">
                {appsScriptCode}
              </pre>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
