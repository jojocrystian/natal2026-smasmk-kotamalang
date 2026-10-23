import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

/**
 * Generate and download participant e-ticket PDF
 */
export async function downloadTicketPdf(participant, event = {}) {
  // A5 portrait: 148 x 210 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Solid Deep Black Background
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, width, height, 'F');

  // Top Outer Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('THIS IS YOUR TICKET', width / 2, 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text('Please show it on your phone when you arrive at the venue', width / 2, 18, { align: 'center' });

  // Main White Ticket Card
  const cardX = 11;
  const cardY = 23;
  const cardW = width - 22; // 126 mm
  const cardH = 163;

  doc.setFillColor(245, 245, 247); // crisp off-white #F5F5F7
  doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'F');

  // Top Row inside card
  const brandName = event.brand || 'NATAL 2026';
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(brandName, cardX + 8, cardY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(140, 140, 140);
  doc.text('CHECKIN CODE', cardX + cardW - 8, cardY + 7, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(String(participant.code || '-'), cardX + cardW - 8, cardY + 11.5, { align: 'right' });

  // QR Code Generation / Display
  let qrImage = participant.qr_image;
  if (!qrImage && participant.code) {
    try {
      qrImage = await QRCode.toDataURL(participant.code, {
        width: 450,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (e) {
      console.warn('QR Code generation fallback error:', e);
    }
  }

  const qrSize = 54;
  const qrX = (width - qrSize) / 2;
  const qrY = cardY + 16;

  if (qrImage) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 3, 3, 'F');
    doc.addImage(qrImage, 'PNG', qrX, qrY, qrSize, qrSize);
  }

  // Centered Event Details below QR
  const eventNameY = qrY + qrSize + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('EVENT NAME', width / 2, eventNameY, { align: 'center' });

  const eventTitle = event.title || 'Natal Bersama SMA/SMK Kota Malang 2026';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text(eventTitle, width / 2, eventNameY + 5, { align: 'center', maxWidth: cardW - 16 });

  const dateTimeY = eventNameY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('DATE AND TIME', width / 2, dateTimeY, { align: 'center' });

  const dateStr = `${event.date || '25/12/2026'}${event.time ? ' • ' + event.time : ' • 08:00 WIB'}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(dateStr, width / 2, dateTimeY + 5, { align: 'center' });

  // Notch Divider with Circular Cutouts and Dashed Line
  const notchY = dateTimeY + 13;
  const notchRadius = 4;
  doc.setFillColor(0, 0, 0);
  doc.circle(cardX, notchY, notchRadius, 'F');
  doc.circle(cardX + cardW, notchY, notchRadius, 'F');

  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(cardX + notchRadius + 2, notchY, cardX + cardW - notchRadius - 2, notchY);
  doc.setLineDashPattern([], 0); // reset pattern

  // Bottom 2-Column Info Grid
  const row1Y = notchY + 8;

  // Left: Customer Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('CUSTOMER NAME', cardX + 8, row1Y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text((participant.full_name || '-').toUpperCase(), cardX + 8, row1Y + 4.5, { maxWidth: 60 });

  if (participant.nickname) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Panggilan: ${participant.nickname}`, cardX + 8, row1Y + 8.5);
  }

  // Right: Venue
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('VENUE', cardX + cardW - 8, row1Y, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const locationStr = event.location || 'Gedung Pertemuan Malang';
  doc.text(locationStr, cardX + cardW - 8, row1Y + 4.5, { align: 'right', maxWidth: 52 });

  // Row 2: Ticket Type & Ticket Price
  const row2Y = row1Y + 14;

  // Left: Ticket Type
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('TICKET TYPE', cardX + 8, row2Y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const ticketTypeStr = participant.grade ? `KELAS ${participant.grade}` : 'PESERTA';
  doc.text(ticketTypeStr, cardX + 8, row2Y + 4.5);

  if (participant.school) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(participant.school, cardX + 8, row2Y + 8.5, { maxWidth: 62 });
  }

  // Right: Ticket Price
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('TICKET PRICE', cardX + cardW - 8, row2Y, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('FREE PASS', cardX + cardW - 8, row2Y + 5.5, { align: 'right' });

  // Outer Footer (under card)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Valid for single entry only • Present at venue entrance', width / 2, cardY + cardH + 7, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text('Powered by Panitia Natal Bersama © 2026', width / 2, cardY + cardH + 11, { align: 'center' });

  // Save / Trigger Download
  const filename = `Tiket_${participant.code}.pdf`;
  doc.save(filename);
}

/**
 * Generate and download School Attendance Recap PDF
 */
export function downloadSchoolRecapPdf(stats, event = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, width, 36, 'F');

  doc.setFillColor(22, 163, 74); // emerald-600
  doc.rect(0, 34, width, 2, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LAPORAN REKAPAN PRESENSI BERDASARKAN SEKOLAH', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  const subtitle = `${event.title || 'Acara Presensi'} • ${event.date || ''} • ${event.location || ''}`;
  doc.text(subtitle, 14, 24);

  const printDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Waktu Cetak Dokumen: ${printDate}`, 14, 30);

  // Summary Metrics Cards
  const total = stats.total || 0;
  const attended = stats.attended || 0;
  const unattended = stats.unattended || 0;
  const rate = stats.attendanceRate || 0;

  const cardY = 42;
  const cardW = (width - 28 - 9) / 4;
  const cardH = 18;

  const summaryBoxes = [
    { label: 'TOTAL TERDAFTAR', val: `${total} Peserta`, color: [15, 23, 42], bg: [241, 245, 249] },
    { label: 'TOTAL HADIR', val: `${attended} Peserta`, color: [22, 101, 52], bg: [240, 253, 244] },
    { label: 'BELUM HADIR', val: `${unattended} Peserta`, color: [180, 83, 9], bg: [254, 243, 199] },
    { label: 'PERSENTASE KEHADIRAN', val: `${rate}%`, color: [21, 128, 61], bg: [220, 252, 231] },
  ];

  summaryBoxes.forEach((box, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(box.bg[0], box.bg[1], box.bg[2]);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(box.label, x + 4, cardY + 6);

    doc.setFontSize(11);
    doc.setTextColor(box.color[0], box.color[1], box.color[2]);
    doc.text(box.val, x + 4, cardY + 13);
  });

  // Table Data
  const tableData = (stats.bySchool || []).map((s, index) => [
    index + 1,
    s.school,
    s.total,
    s.attended,
    s.unattended,
    `${s.attendanceRate}%`
  ]);

  doc.autoTable({
    startY: cardY + cardH + 8,
    margin: { left: 14, right: 14 },
    head: [['No', 'Asal Sekolah', 'Total Peserta', 'Hadir', 'Belum Hadir', 'Tingkat Kehadiran']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 22, halign: 'center', textColor: [22, 101, 52], fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'center', textColor: [180, 83, 9] },
      5: { cellWidth: 32, halign: 'center', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Signature Block at Bottom
  const finalY = doc.lastAutoTable.finalY + 16;
  if (finalY < height - 40) {
    const signX = width - 65;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Mengetahui / Panitia Pelaksana,', signX, finalY);
    doc.line(signX, finalY + 22, width - 14, finalY + 22);
    doc.setFont('helvetica', 'bold');
    doc.text('( Ketua Panitia / Admin )', signX, finalY + 26);
  }

  // Footer
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen resmi Rekapan Presensi Acara • Dihasilkan otomatis oleh Sistem Presensi Terpadu', width / 2, height - 8, { align: 'center' });

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Rekapan_Presensi_Sekolah_${dateStr}.pdf`);
}
