const nodemailer = require('nodemailer');
const db = require('../db');
const { generateTicketPdf } = require('./pdfService');

/**
 * Get current SMTP config from DB
 */
function getSmtpConfig() {
  const getSetting = (k) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
    return row ? row.value : '';
  };

  return {
    host: getSetting('smtp_host'),
    port: parseInt(getSetting('smtp_port') || '587', 10),
    user: getSetting('smtp_user'),
    pass: getSetting('smtp_pass'),
    from: getSetting('smtp_from') || getSetting('smtp_user'),
    enabled: getSetting('smtp_enabled') === '1'
  };
}

/**
 * Send attendee ticket email with PDF attachment
 */
async function sendTicketEmail(participant, eventInfo) {
  const config = getSmtpConfig();

  if (!config.enabled || !config.host || !config.user) {
    console.log(`[Email Service]: SMTP tidak aktif atau belum dikonfigurasi. Lewati pengiriman email ke ${participant.email}.`);
    return { skipped: true, reason: 'SMTP is not configured or disabled' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    const pdfBuffer = await generateTicketPdf(participant, eventInfo);

    const mailOptions = {
      from: `"${eventInfo.title || 'Panitia Acara'}" <${config.from}>`,
      to: participant.email,
      subject: `[Tiket Acara] Registrasi Berhasil - ${participant.full_name} (${participant.code})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: #0f172a; padding: 28px; text-align: center; color: #ffffff;">
            <span style="background: #16a34a; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">Registrasi Berhasil</span>
            <h1 style="margin: 12px 0 6px; font-size: 22px; font-weight: bold;">${eventInfo.title || 'Tiket Presensi Acara'}</h1>
            <p style="margin: 0; color: #94a3b8; font-size: 13px;">${eventInfo.date || ''} • ${eventInfo.time || ''}</p>
          </div>
          
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Halo <b>${participant.full_name}</b> (${participant.nickname}),</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Terima kasih telah mendaftar! Registrasi Anda telah berhasil tercatat di sistem kami.
              Berikut adalah identitas tiket dan kode presensi Anda:
            </p>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
              <span style="font-size: 12px; color: #15803d; font-weight: 600; text-transform: uppercase;">Kode Presensi Anda:</span>
              <div style="font-size: 28px; font-weight: 800; color: #166534; letter-spacing: 1px; margin-top: 4px;">${participant.code}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Asal Sekolah</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9; text-align: right;">${participant.school}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Kelas</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9; text-align: right;">${participant.grade}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Tempat Acara</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9; text-align: right;">${eventInfo.location || '-'}</td></tr>
            </table>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                📌 <b>PENTING:</b> E-Tiket berformat PDF resmi beserta QR Code presensi telah terlampir pada email ini. Silakan unduh dan tunjukkan QR Code tersebut kepada panitia saat presensi acara dimulai.
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Salam hangat,<br><b>Panitia Pelaksana</b></p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Tiket_${participant.code}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent]: Sukses mengirim tiket ke ${participant.email} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`[Email Error] Gagal mengirim email ke ${participant.email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test SMTP configuration
 */
async function testSmtp(customConfig, targetEmail) {
  try {
    const transporter = nodemailer.createTransport({
      host: customConfig.host,
      port: parseInt(customConfig.port, 10),
      secure: parseInt(customConfig.port, 10) === 465,
      auth: {
        user: customConfig.user,
        pass: customConfig.pass
      }
    });

    await transporter.verify();

    if (targetEmail) {
      await transporter.sendMail({
        from: `"${customConfig.from || customConfig.user}" <${customConfig.from || customConfig.user}>`,
        to: targetEmail,
        subject: 'Tes Konfigurasi Email Presensi Berhasil',
        text: 'Ini adalah email uji coba dari Sistem Registrasi & Absensi Acara. Pengaturan SMTP berfungsi dengan normal!'
      });
    }

    return { success: true, message: 'Koneksi SMTP berhasil diverifikasi!' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendTicketEmail,
  testSmtp,
  getSmtpConfig
};
