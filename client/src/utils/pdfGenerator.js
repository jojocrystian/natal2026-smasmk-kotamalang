import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate and download participant e-ticket PDF
 */
export function downloadTicketPdf(participant, event = {}) {
  // A5 portrait: 148 x 210 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 0, width, height, 'F');

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, width, 40, 'F');

  // Accent Line
  doc.setFillColor(22, 163, 74); // emerald-600
  doc.rect(0, 38, width, 2, 'F');

  // Badge
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(12, 8, 36, 6, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('E-TIKET RESMI', 16, 12.2);

  // Event Title
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const eventTitle = event.title || 'ACARA PRESENSI 2026';
  doc.text(eventTitle, 12, 22, { maxWidth: width - 24 });

  // Event Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  const eventDate = `${event.date || 'Tanggal Acara'} • ${event.time || 'Waktu Acara'}`;
  doc.text(eventDate, 12, 29);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Lokasi: ${event.location || 'Tempat Acara'}`, 12, 34, { maxWidth: width - 24 });

  // Main Card
  const cardY = 46;
  const cardW = width - 24;
  const cardH = height - cardY - 14;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, cardY, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(12, cardY, cardW, cardH, 4, 4, 'S');

  // ID Header Box
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(18, cardY + 6, cardW - 12, 16, 3, 3, 'F');
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('KODE PRESENSI PESERTA', 22, cardY + 11.5);

  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text(participant.code, 22, cardY + 18);

  // QR Code
  let nextY = cardY + 26;
  if (participant.qr_image) {
    const qrSize = 48;
    const qrX = (width - qrSize) / 2;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(qrX - 3, nextY, qrSize + 6, qrSize + 6, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(qrX - 3, nextY, qrSize + 6, qrSize + 6, 3, 3, 'S');

    doc.addImage(participant.qr_image, 'PNG', qrX, nextY + 3, qrSize, qrSize);
    nextY += qrSize + 12;
  }

  // Attendee Info Table / Rows
  const drawRow = (label, val, y) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, 20, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(String(val || '-'), 58, y, { maxWidth: cardW - 52 });

    doc.setDrawColor(241, 245, 249);
    doc.line(20, y + 2.5, width - 20, y + 2.5);
  };

  drawRow('Nama Lengkap', participant.full_name, nextY);
  drawRow('Nama Panggilan', participant.nickname, nextY + 8);
  drawRow('Asal Sekolah', participant.school, nextY + 16);
  drawRow('Kelas', participant.grade, nextY + 24);
  drawRow('Email', participant.email, nextY + 32);

  // Footer Instructions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Tunjukkan QR Code ini kepada panitia saat presensi acara. 1 QR Code hanya berlaku untuk 1 kali scan.', width / 2, height - 7, { align: 'center' });

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
