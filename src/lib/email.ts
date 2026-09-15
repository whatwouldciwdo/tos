import nodemailer from 'nodemailer';

// Email configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3120';
const ENABLE_NOTIFICATIONS = process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false';

// Create reusable transporter
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ Email not configured. Set SMTP_USER and SMTP_PASS in .env');
    return null;
  }
  
  return nodemailer.createTransport(SMTP_CONFIG);
};

// Email template wrapper
const createEmailHTML = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #003366 0%, #0066cc 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px 20px;
      border: 1px solid #e0e0e0;
    }
    .info-box {
      background: #f5f5f5;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
    }
    .info-box strong {
      display: block;
      margin-bottom: 5px;
      color: #003366;
    }
    .button {
      display: inline-block;
      background: #0066cc;
      color: #ffffff !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover {
      background: #0052a3;
      color: #ffffff !important;
    }
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-radius: 0 0 8px 8px;
    }
  </style>
</head>
<body>
  ${content}
  <div class="footer">
    <p><strong>PT PLN Indonesia Power - UBP Cilegon</strong></p>
    <p>Sistem TOR (Term of Reference) | Email otomatis, mohon tidak membalas email ini</p>
  </div>
</body>
</html>
`;

// Notification: TOR Submitted for Approval
export async function sendSubmitNotification(params: {
  to: string;
  torNumber: string;
  torTitle: string;
  creatorName: string;
  approvalLink: string;
}) {
  const { to, torNumber, torTitle, creatorName, approvalLink } = params;

  const htmlContent = createEmailHTML(`
    <div class="header">
      <img src="cid:plnlogo" alt="PLN TOS Logo" class="logo" />
      <h1>📋 TOR Menunggu Persetujuan Anda</h1>
    </div>
    <div class="content">
      <p>Halo,</p>
      <p>Term of Reference baru telah diajukan dan membutuhkan persetujuan Anda.</p>
      
      <div class="info-box">
        <strong>Nomor TOR:</strong> ${torNumber}
        <strong>Judul:</strong> ${torTitle}
        <strong>Pembuat:</strong> ${creatorName}
        <strong>Status:</strong> Menunggu Persetujuan
      </div>

      <p>Silakan tinjau dan setujui TOR ini:</p>
      <a href="${approvalLink}" class="button">Lihat & Setujui TOR</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Atau copy link berikut ke browser Anda:<br>
        <a href="${approvalLink}">${approvalLink}</a>
      </p>
    </div>
  `);

  return sendEmail({
    to,
    subject: `[TOR] ${torNumber} - Menunggu Persetujuan Anda`,
    html: htmlContent,
  });
}

// Notification: TOR Needs Revision
export async function sendRevisionNotification(params: {
  to: string;
  torNumber: string;
  torTitle: string;
  revisionNote: string;
  revisorName: string;
  editLink: string;
}) {
  const { to, torNumber, torTitle, revisionNote, revisorName, editLink } = params;

  const htmlContent = createEmailHTML(`
    <div class="header">
      <img src="cid:plnlogo" alt="PLN TOS Logo" class="logo" />
      <h1>🔄 TOR Perlu Revisi</h1>
    </div>
    <div class="content">
      <p>Halo,</p>
      <p>TOR Anda memerlukan perbaikan sebelum dapat disetujui.</p>
      
      <div class="info-box">
        <strong>Nomor TOR:</strong> ${torNumber}
        <strong>Judul:</strong> ${torTitle}
        <strong>Direview oleh:</strong> ${revisorName}
      </div>

      <div class="info-box" style="border-left-color: #ff9800; background: #fff3e0;">
        <strong>Catatan Revisi:</strong>
        <p style="margin: 10px 0 0 0;">${revisionNote}</p>
      </div>

      <p>Silakan perbaiki TOR Anda sesuai catatan di atas:</p>
      <a href="${editLink}" class="button">Edit TOR</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Atau copy link berikut ke browser Anda:<br>
        <a href="${editLink}">${editLink}</a>
      </p>
    </div>
  `);

  return sendEmail({
    to,
    subject: `[TOR] ${torNumber} - Perlu Revisi`,
    html: htmlContent,
  });
}

// Notification: TOR Approved
export async function sendApprovalNotification(params: {
  to: string;
  torNumber: string;
  torTitle: string;
  approverName: string;
  stepLabel: string;
  isLastStep: boolean;
  viewLink: string;
}) {
  const { to, torNumber, torTitle, approverName, stepLabel, isLastStep, viewLink } = params;

  const status = isLastStep ? 'Telah Disetujui Sepenuhnya' : 'Sedang Diproses';
  const icon = isLastStep ? '✅' : '✓';

  const htmlContent = createEmailHTML(`
    <div class="header">
      <img src="cid:plnlogo" alt="PLN TOS Logo" class="logo" />
      <h1>${icon} TOR ${isLastStep ? 'Disetujui' : 'Update Status'}</h1>
    </div>
    <div class="content">
      <p>Halo,</p>
      <p>TOR Anda telah ${isLastStep ? 'disetujui sepenuhnya' : 'disetujui pada tahap berikutnya'}.</p>
      
      <div class="info-box">
        <strong>Nomor TOR:</strong> ${torNumber}
        <strong>Judul:</strong> ${torTitle}
        <strong>Disetujui oleh:</strong> ${approverName} (${stepLabel})
        <strong>Status:</strong> ${status}
      </div>

      ${isLastStep ? `
        <div class="info-box" style="border-left-color: #4caf50; background: #e8f5e9;">
          <p style="margin: 0;"><strong>🎉 Selamat!</strong> TOR Anda telah melalui semua tahap persetujuan dan siap untuk dieksekusi.</p>
        </div>
      ` : `
        <p>TOR Anda sedang dalam proses persetujuan selanjutnya.</p>
      `}

      <a href="${viewLink}" class="button">Lihat TOR</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Atau copy link berikut ke browser Anda:<br>
        <a href="${viewLink}">${viewLink}</a>
      </p>
    </div>
  `);

  return sendEmail({
    to,
    subject: `[TOR] ${torNumber} - ${isLastStep ? 'Disetujui' : 'Update Persetujuan'}`,
    html: htmlContent,
  });
}

// Notification: TOR Rejected
export async function sendRejectionNotification(params: {
  to: string;
  torNumber: string;
  torTitle: string;
  rejectorName: string;
  rejectionNote: string;
  viewLink: string;
}) {
  const { to, torNumber, torTitle, rejectorName, rejectionNote, viewLink } = params;

  const htmlContent = createEmailHTML(`
    <div class="header" style="background: linear-gradient(135deg, #c62828 0%, #e53935 100%);">
      <img src="cid:plnlogo" alt="PLN TOS Logo" class="logo" />
      <h1>❌ TOR Ditolak</h1>
    </div>
    <div class="content">
      <p>Halo,</p>
      <p>TOR Anda telah ditolak dan perlu dibuat ulang.</p>
      
      <div class="info-box">
        <strong>Nomor TOR:</strong> ${torNumber}
        <strong>Judul:</strong> ${torTitle}
        <strong>Ditolak oleh:</strong> ${rejectorName}
      </div>

      <div class="info-box" style="border-left-color: #f44336; background: #ffebee;">
        <strong>Alasan Penolakan:</strong>
        <p style="margin: 10px 0 0 0;">${rejectionNote}</p>
      </div>

      <p>Silakan buat TOR baru dengan mempertimbangkan catatan di atas:</p>
      <a href="${viewLink}" class="button" style="background: #666;">Lihat TOR</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Atau copy link berikut ke browser Anda:<br>
        <a href="${viewLink}">${viewLink}</a>
      </p>
    </div>
  `);

  return sendEmail({
    to,
    subject: `[TOR] ${torNumber} - Ditolak`,
    html: htmlContent,
  });
}

// Core send email function
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!ENABLE_NOTIFICATIONS) {
    console.log('📧 Email notifications disabled');
    return { success: false, message: 'Notifications disabled' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, message: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"TOR System PLN" <${process.env.SMTP_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: [{
        filename: 'pln-tos-logo.jpg',
        path: './public/pln-tos-logo.jpg',
        cid: 'plnlogo' // CID for embedding in email
      }]
    });

    console.log(`✅ Email sent to ${params.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}
