const PDFDocument = require('pdfkit');

/**
 * Generate PDF buffer for an attendee ticket
 * @param {Object} participant 
 * @param {Object} eventInfo 
 * @returns {Promise<Buffer>}
 */
function generateTicketPdf(participant, eventInfo = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        layout: 'portrait',
        margin: 24,
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Background
      doc.rect(0, 0, pageWidth, pageHeight).fill('#f8fafc');

      // Top Modern Header Bar
      const headerHeight = 110;
      doc.rect(0, 0, pageWidth, headerHeight).fill('#0f172a');
      doc.rect(0, headerHeight - 6, pageWidth, 6).fill('#16a34a'); // Green accent line

      // Event Badge Pill
      doc.roundedRect(24, 20, 110, 20, 10).fill('#16a34a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('E-TIKET RESMI', 32, 25);

      // Event Title
      const title = eventInfo.title || 'ACARA PRESENSI 2026';
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(title, 24, 48, { width: pageWidth - 48, lineBreak: false, ellipsis: true });

      // Event Meta (Date & Location)
      const eventMeta = `${eventInfo.date || 'Tanggal Acara'} • ${eventInfo.time || 'Waktu Acara'}`;
      doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(eventMeta, 24, 72);
      doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica').text(`📍 ${eventInfo.location || 'Lokasi Acara'}`, 24, 88, { width: pageWidth - 48, lineBreak: false, ellipsis: true });

      // Main Ticket Body Card
      const cardY = 126;
      const cardWidth = pageWidth - 48;
      const cardHeight = pageHeight - cardY - 50;

      doc.roundedRect(24, cardY, cardWidth, cardHeight, 14).fill('#ffffff');
      doc.roundedRect(24, cardY, cardWidth, cardHeight, 14).lineWidth(1).stroke('#e2e8f0');

      // ID Header Inside Card
      doc.roundedRect(38, cardY + 16, cardWidth - 28, 42, 8).fill('#f0fdf4');
      doc.fillColor('#15803d').fontSize(9).font('Helvetica-Bold').text('KODE PRESENSI PESERTA', 50, cardY + 22);
      doc.fillColor('#166534').fontSize(18).font('Helvetica-Bold').text(participant.code, 50, cardY + 34);

      // QR Code Section
      let qrTop = cardY + 70;
      if (participant.qr_image && participant.qr_image.startsWith('data:image')) {
        const base64Data = participant.qr_image.replace(/^data:image\/\w+;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');
        const qrSize = 130;
        const qrX = (pageWidth - qrSize) / 2;

        // QR Background box
        doc.roundedRect(qrX - 8, qrTop, qrSize + 16, qrSize + 16, 10).fill('#f8fafc');
        doc.roundedRect(qrX - 8, qrTop, qrSize + 16, qrSize + 16, 10).lineWidth(1).stroke('#e2e8f0');
        doc.image(qrBuffer, qrX, qrTop + 8, { width: qrSize, height: qrSize });
        qrTop += qrSize + 28;
      }

      // Attendee Details Box
      const detailsY = qrTop;
      const row = (label, val, y) => {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(label, 44, y);
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(val || '-', 160, y, { width: pageWidth - 210, ellipsis: true });
        doc.moveTo(44, y + 16).lineTo(pageWidth - 44, y + 16).lineWidth(0.5).stroke('#f1f5f9');
      };

      row('Nama Lengkap', participant.full_name, detailsY);
      row('Nama Panggilan', participant.nickname, detailsY + 20);
      row('Asal Sekolah', participant.school, detailsY + 40);
      row('Kelas', participant.grade, detailsY + 60);
      row('Email', participant.email, detailsY + 80);

      // Warning / Instructions
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
        .text('Tunjukkan QR Code ini kepada panitia saat presensi acara. 1 QR Code hanya berlaku untuk 1 kali scan.', 24, pageHeight - 36, {
          align: 'center',
          width: pageWidth - 48
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateTicketPdf
};
