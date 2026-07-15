import nodemailer from 'nodemailer';

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;
  const host = process.env.SMTP_HOST || inferSmtpHost(user);
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host || !user || !pass) return null;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

export async function sendMail({ to, subject, text, html }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) return { skipped: true, reason: 'No recipients' };

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[mail] SMTP is not configured. Skipped email to ${recipients.join(', ')}: ${subject}`);
    return { skipped: true, reason: 'SMTP not configured' };
  }

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER,
    to: recipients.join(', '),
    subject,
    text,
    html,
  });
}

function inferSmtpHost(user = '') {
  const email = String(user || '').toLowerCase();
  if (email.endsWith('@gmail.com')) return 'smtp.gmail.com';
  return '';
}
