import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import { downloadTicketPdf } from '../utils/pdfGenerator';

export default function TicketCard({ isOpen, participant, event, onClose }) {
  const [qrUrl, setQrUrl] = useState(participant?.qr_image || '');

  useEffect(() => {
    if (!participant) return;
    if (participant.qr_image) {
      setQrUrl(participant.qr_image);
    } else if (participant.code) {
      QRCode.toDataURL(participant.code, {
        width: 450,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(setQrUrl).catch(() => {});
    }
  }, [participant]);

  if (!isOpen || !participant) return null;

  const eventTitle = event?.title || 'Natal Bersama SMA/SMK Kota Malang 2026';
  const eventDate = event?.date || '25/12/2026';
  const eventTime = event?.time ? ` • ${event.time}` : ' • 08:00 WIB';
  const eventLocation = event?.location || 'Gedung Pertemuan Malang';
  const brandName = event?.brand || 'NATAL 2026';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm sm:max-w-md my-auto py-4 flex flex-col items-center">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-0 right-0 sm:-right-2 z-20 w-8 h-8 rounded-full bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Outer Header Text */}
        <div className="text-center mb-4 sm:mb-5 select-none">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            THIS IS YOUR TICKET
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-normal">
            Please show it on your phone when you arrive at the venue
          </p>
        </div>

        {/* The White Ticket Card */}
        <div className="bg-[#f5f5f7] text-black rounded-3xl p-5 sm:p-7 shadow-2xl relative w-full overflow-hidden">
          
          {/* Card Top Row: Brand & Checkin Code */}
          <div className="flex items-start justify-between">
            <span className="font-black text-xs sm:text-sm tracking-widest text-black uppercase">
              {brandName}
            </span>
            <div className="text-right">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                CHECKIN CODE
              </div>
              <div className="font-mono font-black text-xs sm:text-sm tracking-wider text-black mt-0.5">
                {participant.code}
              </div>
            </div>
          </div>

          {/* Centered Large QR Code */}
          <div className="py-2.5 sm:py-3.5 flex justify-center items-center">
            <div className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-sm inline-block">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR Code ${participant.code}`}
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain block mx-auto"
                />
              ) : (
                <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs">
                  Memuat QR Code...
                </div>
              )}
            </div>
          </div>

          {/* Event Details (Centered below QR) */}
          <div className="text-center mt-1">
            <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              EVENT NAME
            </div>
            <div className="text-base sm:text-lg font-black text-black tracking-tight mt-0.5 leading-snug">
              {eventTitle}
            </div>

            <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-2.5 sm:mt-3">
              DATE AND TIME
            </div>
            <div className="text-xs sm:text-sm font-bold text-black mt-0.5">
              {eventDate}{eventTime}
            </div>
          </div>

          {/* Ticket Perforation / Notches Divider */}
          <div className="relative py-4 -mx-5 sm:-mx-7 my-2 flex items-center justify-between pointer-events-none select-none">
            {/* Left Notch */}
            <div className="w-6 h-6 rounded-r-full bg-black shadow-inner" />
            {/* Dashed Line */}
            <div className="flex-1 border-t-2 border-dashed border-neutral-300 mx-3" />
            {/* Right Notch */}
            <div className="w-6 h-6 rounded-l-full bg-black shadow-inner" />
          </div>

          {/* Bottom 2-Column Info Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-0.5">
            {/* Left: Customer Name */}
            <div>
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                CUSTOMER NAME
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-black uppercase tracking-tight mt-0.5 leading-tight break-words">
                {participant.full_name}
              </div>
              {participant.nickname && (
                <div className="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5">
                  Panggilan: {participant.nickname}
                </div>
              )}
            </div>

            {/* Right: Venue */}
            <div className="text-right">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                VENUE
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-black tracking-tight mt-0.5 leading-tight break-words">
                {eventLocation}
              </div>
            </div>

            {/* Left: Ticket Type */}
            <div className="mt-1">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                TICKET TYPE
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-black uppercase tracking-tight mt-0.5 leading-tight">
                {participant.grade ? `KELAS ${participant.grade}` : 'PESERTA'}
              </div>
              {participant.school && (
                <div className="text-[10px] sm:text-xs text-neutral-600 font-semibold truncate max-w-[150px] sm:max-w-[180px] mt-0.5">
                  {participant.school}
                </div>
              )}
              {participant.email && (
                <div className="text-[9px] text-neutral-400 truncate max-w-[150px] sm:max-w-[180px]">
                  {participant.email}
                </div>
              )}
            </div>

            {/* Right: Ticket Price */}
            <div className="text-right mt-1">
              <div className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                TICKET PRICE
              </div>
              <div className="font-black text-base sm:text-xl text-black mt-0.5 tracking-tight">
                FREE PASS
              </div>
            </div>
          </div>

        </div>

        {/* Outer Footer (Under the Card) */}
        <div className="text-center mt-4 sm:mt-5 space-y-1 select-none">
          <p className="text-[11px] sm:text-xs text-neutral-400 tracking-wide">
            Valid for single entry only • Present at venue entrance
          </p>
          <p className="text-[10px] sm:text-[11px] text-neutral-600">
            Powered by Panitia Natal Bersama &copy; 2026
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-4 sm:mt-5">
          <button
            onClick={() => downloadTicketPdf({ ...participant, qr_image: qrUrl }, event)}
            className="flex-1 py-3 px-5 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download PDF Tiket
          </button>
          <button
            onClick={onClose}
            className="py-3 px-6 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl font-semibold text-xs sm:text-sm border border-neutral-800 transition-colors cursor-pointer text-center"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
