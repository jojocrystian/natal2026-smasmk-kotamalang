const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generate PDF buffer for an attendee ticket
 * @param {Object} participant 
 * @param {Object} eventInfo 
 * @returns {Promise<Buffer>}
 */
async function generateTicketPdf(participant, eventInfo = {}) {
  // Ensure QR code buffer is ready
  let qrBuffer = null;
  if (participant.qr_image && participant.qr_image.startsWith('data:image')) {
    const base64Data = participant.qr_image.replace(/^data:image\/\w+;base64,/, '');
    qrBuffer = Buffer.from(base64Data, 'base64');
  } else if (participant.code) {
    try {
      qrBuffer = await QRCode.toBuffer(participant.code, {
        width: 450,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (e) {
      console.warn('QR Code buffer error:', e);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        layout: 'portrait',
        margin: 0
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Solid Deep Black Background
      doc.rect(0, 0, pageWidth, pageHeight).fill('#000000');

      // Top Outer Header Text
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
        .text('THIS IS YOUR TICKET', 0, 26, { align: 'center', width: pageWidth });

      doc.fillColor('#9ca3af').fontSize(8.5).font('Helvetica')
        .text('Please show it on your phone when you arrive at the venue', 0, 48, { align: 'center', width: pageWidth });

      // Main White Ticket Card
      const cardX = 26;
      const cardY = 68;
      const cardW = pageWidth - 52;
      const cardH = 460;

      doc.roundedRect(cardX, cardY, cardW, cardH, 14).fill('#f5f5f7');

      // Top Row inside Card: Brand & Checkin Code
      const brandName = eventInfo.brand || 'NATAL 2026';
      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold')
        .text(brandName, cardX + 18, cardY + 18);

      doc.fillColor('#9ca3af').fontSize(7.5).font('Helvetica-Bold')
        .text('CHECKIN CODE', cardX, cardY + 14, { align: 'right', width: cardW - 18 });

      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold')
        .text(String(participant.code || '-'), cardX, cardY + 24, { align: 'right', width: cardW - 18 });

      // QR Code
      const qrSize = 145;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = cardY + 46;

      doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10).fill('#ffffff');
      if (qrBuffer) {
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      }

      // Event Info Centered below QR
      const eventNameY = qrY + qrSize + 14;
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica-Bold')
        .text('EVENT NAME', 0, eventNameY, { align: 'center', width: pageWidth });

      const eventTitle = eventInfo.title || 'Natal Bersama SMA/SMK Kota Malang 2026';
      doc.fillColor('#000000').fontSize(13).font('Helvetica-Bold')
        .text(eventTitle, cardX + 16, eventNameY + 12, { align: 'center', width: cardW - 32 });

      const dateY = eventNameY + 36;
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica-Bold')
        .text('DATE AND TIME', 0, dateY, { align: 'center', width: pageWidth });

      const dateStr = `${eventInfo.date || '25/12/2026'}${eventInfo.time ? ' • ' + eventInfo.time : ' • 08:00 WIB'}`;
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
        .text(dateStr, 0, dateY + 12, { align: 'center', width: pageWidth });

      // Notch Divider & Dashed Line
      const notchY = dateY + 36;
      doc.circle(cardX, notchY, 11).fill('#000000');
      doc.circle(cardX + cardW, notchY, 11).fill('#000000');

      doc.moveTo(cardX + 18, notchY)
        .lineTo(cardX + cardW - 18, notchY)
        .dash(4, { space: 4 })
        .strokeColor('#d4d4d8')
        .stroke();
      doc.undash();

      // 2-Column Details Grid
      const row1Y = notchY + 14;

      // Customer Name
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica-Bold')
        .text('CUSTOMER NAME', cardX + 18, row1Y);

      doc.fillColor('#000000').fontSize(10.5).font('Helvetica-Bold')
        .text((participant.full_name || '-').toUpperCase(), cardX + 18, row1Y + 11, { width: 170 });

      if (participant.nickname) {
        doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
          .text(`Panggilan: ${participant.nickname}`, cardX + 18, row1Y + 23);
      }

      // Venue
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica-Bold')
        .text('VENUE', cardX, row1Y, { align: 'right', width: cardW - 18 });

      const locationStr = eventInfo.location || 'Gedung Pertemuan Malang';
      doc.fillColor('#000000').fontSize(9.5).font('Helvetica-Bold')
        .text(locationStr, cardX, row1Y + 11, { align: 'right', width: cardW - 18 });

      // Row 2: Ticket Type & Price
      const row2Y = row1Y + 38;

      // Ticket Type
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica-Bold')
        .text('TICKET TYPE', cardX + 18, row2Y);

      const ticketType = participant.grade ? `KELAS ${participant.grade}` : 'PESERTA';
      doc.fillColor('#000000').fontSize(10.5).font('Helvetica-Bold')
        .text(ticketType, cardX + 18, row2Y + 11);

      if (participant.school) {
        doc.fillColor('#4b5563').fontSize(8.5).font('Helvetica')
          .text(participant.school, cardX + 18, row2Y + 23, { width: 170 });
      }

      // Ticket Price
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica-Bold')
        .text('TICKET PRICE', cardX, row2Y, { align: 'right', width: cardW - 18 });

      doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold')
        .text('FREE PASS', cardX, row2Y + 11, { align: 'right', width: cardW - 18 });

      // Outer Footer
      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
        .text('Valid for single entry only • Present at venue entrance', 0, pageHeight - 34, { align: 'center', width: pageWidth });

      doc.fillColor('#6b7280').fontSize(7.5).font('Helvetica')
        .text('Powered by Panitia Natal Bersama © 2026', 0, pageHeight - 22, { align: 'center', width: pageWidth });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateTicketPdf
};
