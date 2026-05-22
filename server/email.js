import nodemailer from 'nodemailer';

let transporter;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
} else {
  transporter = {
    sendMail: async (opts) => {
      console.log('[email-stub] To:', opts.to, 'Subject:', opts.subject);
      console.log('[email-stub] Body:', opts.text);
      return { messageId: 'stub-' + Date.now() };
    },
  };
}

export default transporter;
