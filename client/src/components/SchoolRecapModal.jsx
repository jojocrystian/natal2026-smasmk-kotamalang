import React, { useState } from 'react';
import { X, School, Download, Search, CheckCircle2, Clock, Users } from 'lucide-react';
import { downloadSchoolRecapPdf } from '../utils/pdfGenerator';

export default function SchoolRecapModal({ isOpen, stats, event, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !stats) return null;

  const schoolList = stats.bySchool || [];
  const filteredSchools = schoolList.filter(s =>
    s.school.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <School className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-lg">Rekapan Presensi Sekolah</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Total {schoolList.length} Sekolah Terdaftar</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => downloadSchoolRecapPdf(stats, event)}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Rekapan</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900/50 border-b border-slate-800">
          <div className="bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium">Total Terdaftar</span>
            <span className="text-base sm:text-xl font-bold text-white">{stats.total} Peserta</span>
          </div>
          <div className="bg-emerald-950/20 p-2.5 sm:p-3 rounded-xl border border-emerald-900/40">
            <span className="text-[10px] sm:text-[11px] text-emerald-400 block font-medium">Total Hadir</span>
            <span className="text-base sm:text-xl font-bold text-emerald-400">{stats.attended} Peserta</span>
          </div>
          <div className="bg-amber-950/20 p-2.5 sm:p-3 rounded-xl border border-amber-900/40">
            <span className="text-[10px] sm:text-[11px] text-amber-400 block font-medium">Belum Hadir</span>
            <span className="text-base sm:text-xl font-bold text-amber-400">{stats.unattended} Peserta</span>
          </div>
          <div className="bg-blue-950/20 p-2.5 sm:p-3 rounded-xl border border-blue-900/40">
            <span className="text-[10px] sm:text-[11px] text-blue-400 block font-medium">Tingkat Hadir</span>
            <span className="text-base sm:text-xl font-bold text-blue-400">{stats.attendanceRate}%</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama sekolah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredSchools.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Tidak ada data sekolah yang cocok dengan pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Asal Sekolah</th>
                    <th className="py-2.5 px-3 text-center">Total</th>
                    <th className="py-2.5 px-3 text-center">Hadir</th>
                    <th className="py-2.5 px-3 text-center">Belum</th>
                    <th className="py-2.5 px-3">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredSchools.map((item, index) => (
                    <tr key={item.school} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {item.school}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-200">
                        {item.total}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-400">
                        {item.attended}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-400">
                        {item.unattended}
                      </td>
                      <td className="py-3 px-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${item.attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 w-9 text-right">
                            {item.attendanceRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
