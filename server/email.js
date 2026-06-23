import nodemailer from 'nodemailer';

// Neutralize CR/LF and other control chars before echoing mail fields to the
// console, so a tainted recipient/subject/body (e.g. a forged Host header that
// reaches the reset URL) cannot forge or split log entries (CodeQL
// js/log-injection).
// Strip CR/LF first (the explicit [\r\n] form is what CodeQL recognizes as a
// js/log-injection sanitizer) then any other C0/DEL control chars.
// eslint-disable-next-line no-control-regex
const stripLogControl = (v) => String(v).replace(/[\r\n]+/g, ' ').replace(/[\x00-\x1f\x7f]/g, ' ');

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
      console.log('[email-stub] To:', stripLogControl(opts.to), 'Subject:', stripLogControl(opts.subject));
      console.log('[email-stub] Body:', stripLogControl(opts.text));
      return { messageId: 'stub-' + Date.now() };
    },
  };
}

export default transporter;
