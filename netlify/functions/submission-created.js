/* Runs on Netlify every time a form on the site is submitted (Netlify calls it "submission-created").
   For cohort and private coaching applications, it emails the applicant a confirmation in the
   Melius One letterhead, from obi@meliusoneconsulting.com through Zoho Mail.
   Needs these environment variables in Netlify (Site configuration → Environment variables):
     ZOHO_USER          obi@meliusoneconsulting.com
     ZOHO_APP_PASSWORD  an app-specific password made in Zoho (not your normal password)
     ZOHO_SMTP_HOST     optional; smtppro.zoho.com by default (use smtppro.zohocloud.ca if your Zoho account is in Canada) */
const nodemailer = require('nodemailer');
const { esc, p, h, steps, box, button, letter, SITE, SEAL_CID, useEmbeddedLogo } = require('../lib/letter');
const SEAL_B64 = require('../lib/seal-b64');
useEmbeddedLogo(true);

const BOOK = 'https://calendar.app.google/Njkvmqf26i2frhhg9';

function confirmation(kind, first) {
  const cohort = kind === 'cohort';
  const name = esc(first);
  const what = cohort ? 'the Freedom Steps Cohort' : 'private coaching';
  const body =
    p(`Hi ${name},`) +
    p(`Thank you for applying for <b>${what}</b>. Your application is in, and I read every one myself.`) +
    h('What happens next') +
    steps(cohort ? [
      'I’ll review your answers and reply within <b>two business days</b>.',
      'If the cohort is a good fit, you’ll get the start date, the weekly session time and a link to save your seat.',
      'You only pay once you’ve confirmed your seat. Nothing is charged today.'
    ] : [
      'I’ll review your answers and reply within <b>two business days</b>.',
      'If private coaching is a good fit, we’ll start with a free 30-minute intro call, so you can ask me anything first.',
      'You only pay once you decide to go ahead. Nothing is charged today.'
    ]) +
    h(cohort ? 'How the cohort works' : 'How private coaching works') +
    box(cohort
      ? 'Six live 60-minute group sessions, one a week, recorded if you miss one. Each module comes with a written lesson and a worksheet, and you get a private cohort group chat with answers from me every weekday.<br><br><b>$399</b> by card, or 3 payments of $133. <b>$369</b> when you pay in full by Interac e-Transfer.'
      : 'Six private 60-minute sessions built around your own accounts, numbers and goals, with a written summary after each one, and messages between sessions for 90 days.<br><br><b>$1,497</b> by card, or 3 payments of $499. <b>$1,397</b> when you pay in full by Interac e-Transfer.') +
    p('If your first ' + (cohort ? 'cohort week' : 'session') + ' isn’t useful, ask within 7 days and the full amount is refunded.') +
    h('While you wait') +
    p(`Set up your free <a href="${SITE}/app/" style="color:#14213D">Melius Money</a> plan: your income, bills, debts and spending. It takes about 10 minutes, and it makes our first session far more useful.`) +
    button(`${SITE}/app/`, 'Open Melius Money') +
    p('Questions before then? Just reply to this email.') +
    p('Talk soon,');
  return {
    subject: cohort ? 'Your Freedom Steps Cohort application is in' : 'Your private coaching application is in',
    html: letter(body, 'Your application is in. Here’s what happens next.'),
    text: `Hi ${first},\n\nThank you for applying for ${what}. Your application is in, and I'll reply within two business days. You only pay once you've confirmed. Nothing is charged today.\n\nWhile you wait, set up your free Melius Money plan: ${SITE}/app/\n\nObi Oji\nMelius One Consulting\nobi@meliusoneconsulting.com`
  };
}

exports.handler = async (event) => {
  let payload;
  try { payload = JSON.parse(event.body).payload; } catch (e) { return { statusCode: 200, body: 'no payload' }; }
  const form = payload.form_name || (payload.data && payload.data['form-name']);
  const kind = form === 'cohort-application' ? 'cohort' : form === 'private-application' ? 'private' : null;
  if (!kind) return { statusCode: 200, body: 'not an application' };
  const d = payload.data || {};
  if (d.company) return { statusCode: 200, body: 'spam' };
  const to = String(d.email || payload.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { statusCode: 200, body: 'no email' };
  const first = String(d.name || 'there').trim().split(/\s+/)[0].slice(0, 40) || 'there';
  if (!process.env.ZOHO_USER || !process.env.ZOHO_APP_PASSWORD) { console.log('Email not sent: ZOHO_USER / ZOHO_APP_PASSWORD not set'); return { statusCode: 200, body: 'email not configured' }; }
  const mail = confirmation(kind, first);
  try {
    const t = nodemailer.createTransport({ host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.com', port: 465, secure: true, auth: { user: process.env.ZOHO_USER, pass: process.env.ZOHO_APP_PASSWORD } });
    await t.sendMail({ from: `"Obi Oji, Melius One" <${process.env.ZOHO_USER}>`, to, replyTo: process.env.ZOHO_USER, subject: mail.subject, html: mail.html, text: mail.text,
      attachments: [{ filename: 'melius-one.png', content: Buffer.from(SEAL_B64, 'base64'), contentType: 'image/png', cid: SEAL_CID, contentDisposition: 'inline' }] });
    console.log('Confirmation sent for', kind);
  } catch (e) { console.log('Email failed:', e.message); }
  return { statusCode: 200, body: 'ok' };
};

exports.confirmation = confirmation;
