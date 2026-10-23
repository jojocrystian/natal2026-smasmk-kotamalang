import React from 'react';
import { Download, X, CheckCircle, Calendar, MapPin, Mail, School, User } from 'lucide-react';
import { downloadTicketPdf } from '../utils/pdfGenerator';

export default function TicketCard({ isOpen, participant, event, onClose }) {
  if (!isOpen || !participant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative my-auto max-h-[94vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Ticket Header */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
              E-Tiket Terverifikasi
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">{event?.title || 'Acara Presensi 2026'}</h2>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1.5 text-xs text-emerald-100 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {event?.date}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event?.location}</span>
            </div>
          </div>

          {/* Ticket Notch Line */}
          <div className="relative flex items-center justify-between px-3 -my-3 z-10">
            <div className="w-5 h-5 rounded-full bg-slate-950 border-r border-slate-800" />
            <div className="flex-1 border-b-2 border-dashed border-slate-700 mx-2" />
            <div className="w-5 h-5 rounded-full bg-slate-950 border-l border-slate-800" />
          </div>

          {/* Ticket Body */}
          <div className="p-4 sm:p-6 bg-slate-900 space-y-4 sm:space-y-5">
            
            {/* QR Code Presentation */}
            <div className="flex flex-col items-center">
              <div className="p-2.5 sm:p-3 bg-white rounded-2xl shadow-lg border border-slate-200 inline-block">
                {participant.qr_image ? (
                  <img
                    src={participant.qr_image}
                    alt={`QR Code ${participant.code}`}
                    className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                    QR Code Memuat...
                  </div>
                )}
              </div>
              
              <div className="mt-2.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wider uppercase">ID Presensi Peserta</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-wide font-mono">
                  {participant.code}
                </div>
              </div>
            </div>

            {/* Attendee Details */}
            <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Nama Lengkap</span>
                <span className="font-semibold text-white text-right max-w-[190px] truncate">{participant.full_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Panggilan</span>
                <span className="font-semibold text-white">{participant.nickname}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5"><School className="w-3.5 h-3.5" /> Asal Sekolah</span>
                <span className="font-semibold text-white text-right max-w-[190px] truncate">{participant.school}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Kelas</span>
                <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                  Kelas {participant.grade}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
                <span className="font-semibold text-slate-300 text-right truncate max-w-[180px]">{participant.email}</span>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-400">
              Tunjukkan QR Code ini kepada panitia saat presensi acara.
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={() => downloadTicketPdf(participant, event)}
                className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.01]"
              >
                <Download className="w-4 h-4" />
                Download PDF Tiket
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs sm:text-sm transition-colors text-center"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
