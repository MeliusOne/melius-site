/* Melius One letterhead for emails: navy band with the seal, gold rule, body, signature, motto.
   Built with tables and inline styles so it looks the same in Gmail, Outlook and Apple Mail. */
const NAVY = '#14213D', GOLD = '#C9A35E', INK = '#14213D', MUTED = '#5A6474', SOFT = '#8A93A3';
const SITE = 'https://meliusoneconsulting.com';
const SEAL_CID = 'seal@meliusoneconsulting.com';
/* LOGO is the image address used in the letter: the embedded copy (cid:) for emails the website sends,
   or the web address for templates you paste into Zoho. */
let LOGO = `${SITE}/seal.png`;
function useEmbeddedLogo(on) { LOGO = on ? `cid:${SEAL_CID}` : `${SITE}/seal.png`; }

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function p(html) { return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${INK}">${html}</p>`; }
function h(text) { return `<p style="margin:24px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:24px;color:${INK}">${text}</p>`; }
function steps(items) {
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 16px">` + items.map((t, i) =>
    `<tr><td style="vertical-align:top;padding:0 12px 12px 0"><div style="width:26px;height:26px;border-radius:13px;background:${NAVY};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;line-height:26px;text-align:center">${i + 1}</div></td>` +
    `<td style="vertical-align:top;padding:2px 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:${INK}">${t}</td></tr>`).join('') + `</table>`;
}
function box(html) { return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:4px 0 18px"><tr><td style="background:#F9F7F2;border-left:3px solid ${GOLD};padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:${INK}">${html}</td></tr></table>`; }
function button(href, label) { return `<p style="margin:6px 0 18px"><a href="${href}" style="display:inline-block;background:${NAVY};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:11px 20px;border-radius:20px">${label}</a></p>`; }

function signature() { return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:${INK};border-collapse:collapse">
  <tr><td style="padding:0 16px 0 0;vertical-align:top"><img src="${LOGO}" width="56" height="56" alt="" style="display:block;border:0;width:56px;height:56px"></td>
  <td style="border-left:2px solid ${GOLD};padding:0 0 0 16px;vertical-align:top">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:23px;color:${INK}">Obi Oji</div>
    <div style="font-size:11px;line-height:17px;color:${MUTED};letter-spacing:1px;text-transform:uppercase">Founder &middot; Melius One Consulting</div>
    <div style="font-size:13px;line-height:20px;color:${INK};padding-top:6px">+1 647 657 2925<br><a href="mailto:obi@meliusoneconsulting.com" style="color:${INK};text-decoration:none">obi@meliusoneconsulting.com</a><br><a href="${SITE}" style="color:${INK};text-decoration:none">meliusoneconsulting.com</a> &middot; Kitchener, Ontario</div>
  </td></tr></table>`; }

function letter(bodyHtml, preheader) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Melius One Consulting</title></head>
<body style="margin:0;padding:0;background:#F4F2EE">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || '')}</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F2EE;border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #E3DED3;border-collapse:collapse">
  <tr><td style="background:${NAVY};padding:20px 28px">
    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>
      <td style="padding-right:12px;vertical-align:middle"><img src="${LOGO}" width="44" height="44" alt="Melius One" style="display:block;border:0;width:44px;height:44px"></td>
      <td style="vertical-align:middle"><div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:24px;color:#ffffff">Melius One</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:14px;letter-spacing:3px;color:#C3CBD8;padding-top:3px">CONSULTING &middot; EST. 2021</div></td>
    </tr></table></td></tr>
  <tr><td style="background:${GOLD};height:3px;line-height:3px;font-size:0">&nbsp;</td></tr>
  <tr><td style="padding:30px 28px 8px">${bodyHtml}</td></tr>
  <tr><td style="padding:8px 28px 28px">${signature()}</td></tr>
  <tr><td style="background:#F9F7F2;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:${SOFT}">
    <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:${MUTED}">Dum vivas, fac melius</span> &middot; As long as you live, do better<br>
    Financial education only, not investment, tax or legal advice. Melius One Consulting does not manage money or trade for clients.</td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = { esc, p, h, steps, box, button, letter, SITE, SEAL_CID, useEmbeddedLogo };
