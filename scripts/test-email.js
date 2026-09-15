// scripts/test-email.js
// Test script to verify Gmail SMTP connection and email sending

require('dotenv').config();
const nodemailer = require('nodemailer').default || require('nodemailer');

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  },
};

async function testEmailConnection() {
  console.log('🧪 Testing Gmail SMTP Connection...\n');

  // Check environment variables
  console.log('📋 Configuration:');
  console.log(`   SMTP_HOST: ${SMTP_CONFIG.host}`);
  console.log(`   SMTP_PORT: ${SMTP_CONFIG.port}`);
  console.log(`   SMTP_USER: ${SMTP_CONFIG.auth.user || '❌ NOT SET'}`);
  console.log(`   SMTP_PASS: ${SMTP_CONFIG.auth.pass ? '✓ SET' : '❌ NOT SET'}\n`);

  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.error('❌ Error: SMTP_USER and SMTP_PASS must be set in .env file');
    console.log('\n📝 Please add the following to your .env file:');
    console.log('   SMTP_USER=your-email@gmail.com');
    console.log('   SMTP_PASS=your-16-digit-app-password');
    process.exit(1);
  }

  try {
    // Test connection
    console.log('🔌 Testing connection...');
    const transporter = nodemailer.createTransporter(SMTP_CONFIG);
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: `"TOR Online System Test" <${SMTP_CONFIG.auth.user}>`,
      to: SMTP_CONFIG.auth.user, // Send to self
      subject: '✅ TOR Online System - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0;">🎉 Email Test Berhasil!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
            <p style="font-size: 16px; color: #333;">Gmail SMTP configuration Anda sudah benar!</p>
            <p style="color: #666;">Sistem TOR Online siap mengirim notifikasi email untuk:</p>
            <ul style="color: #666;">
              <li>Approval notifications</li>
              <li>Revision requests</li>
              <li>Rejection alerts</li>
            </ul>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Test dilakukan pada: ${new Date().toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Test email sent successfully!`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Email sent to: ${SMTP_CONFIG.auth.user}\n`);
    console.log('🎉 Email service is ready! Check your inbox.');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n💡 Common issues:');
    console.log('   1. Make sure you are using Gmail App Password, not your regular password');
    console.log('   2. Ensure 2-Factor Authentication is enabled on your Gmail account');
    console.log('   3. Generate App Password at: https://myaccount.google.com/apppasswords');
    console.log('   4. Check that SMTP_USER is your full Gmail address');
    console.log('   5. Check that SMTP_PASS is the 16-digit App Password (without spaces)');
    process.exit(1);
  }
}

testEmailConnection();
