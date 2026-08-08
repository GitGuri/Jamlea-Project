const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

async function sendEmail(to, subject, text) {
  const t = getTransporter();
  if (!t || !to) return;
  try {
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
  } catch (err) {
    console.error('Failed to send email to', to, '-', err.message);
  }
}

// Creates an in-app notification for one user and, if an email is given, emails them too.
async function notifyUser({ userId, type, title, message, relatedType, relatedId, email }) {
  const { error } = await supabase.from('notifications').insert([{
    user_id: userId,
    type,
    title,
    message,
    related_type: relatedType || null,
    related_id: relatedId || null,
  }]);

  if (error) console.error('Failed to create notification:', error.message);
  if (email) await sendEmail(email, title, message);
}

// Notifies every admin/sales_rep, both in-app and by email.
async function notifyInternalTeam({ type, title, message, relatedType, relatedId }) {
  const { data: staff, error } = await supabase
    .from('users')
    .select('id, email')
    .in('role', ['admin', 'sales_rep']);

  if (error) {
    console.error('Failed to load internal team for notification:', error.message);
    return;
  }
  if (!staff || staff.length === 0) return;

  const rows = staff.map((s) => ({
    user_id: s.id,
    type,
    title,
    message,
    related_type: relatedType || null,
    related_id: relatedId || null,
  }));

  const { error: insertErr } = await supabase.from('notifications').insert(rows);
  if (insertErr) console.error('Failed to create internal notifications:', insertErr.message);

  await Promise.all(staff.map((s) => sendEmail(s.email, title, message)));
}

module.exports = { notifyUser, notifyInternalTeam, sendEmail };
