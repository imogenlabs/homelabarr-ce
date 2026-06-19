import { describe, it, expect, beforeEach, vi } from 'vitest';
import nodemailer from 'nodemailer';

// Regression coverage for the nodemailer 9 upgrade (HLCE-202). server/email.js
// builds its transporter at import time from env, so each case resets modules
// and sets env before importing.
describe('server/email transporter', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it('falls back to a stub transporter when SMTP_HOST is unset', async () => {
    const { default: transporter } = await import('./email.js');
    const info = await transporter.sendMail({ to: 'x@y.com', subject: 's', text: 'b' });
    expect(info.messageId).toMatch(/^stub-/);
  });

  it('builds a real nodemailer Mail transport when SMTP_HOST is set', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';
    const { default: transporter } = await import('./email.js');
    expect(typeof transporter.sendMail).toBe('function');
    expect(transporter.constructor.name).toBe('Mail');
  });

  it('nodemailer 9 createTransport + sendMail works end-to-end (offline)', async () => {
    const transporter = nodemailer.createTransport({ jsonTransport: true });
    const info = await transporter.sendMail({
      from: 'noreply@homelabarr.com',
      to: 'user@example.com',
      subject: 'smoke',
      text: 'hi',
    });
    expect(info.messageId).toBeTruthy();
    expect(info.envelope.to).toContain('user@example.com');
  });
});
