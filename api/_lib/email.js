const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = process.env.FROM_NAME || '面談スケジューラー';

function formatDT(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

async function sendBookingReceivedEmail(booking, slots) {
  const prefList = booking.preferences
    .map((slotId, i) => {
      const slot = slots.find(s => s.id === slotId);
      if (!slot) return '';
      return `<li>第${i + 1}希望: ${formatDT(slot.start)}〜${formatTime(slot.end)}</li>`;
    }).join('');
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: booking.email,
      subject: '【面談スケジューラー】面談希望を受け付けました',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;"><div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><h2 style="color:#667eea;margin-top:0;">📅 面談希望を受け付けました</h2><p>${booking.name} さん</p><p>以下の内容で面談希望を受け付けました。<br>面談日時が確定しましたら、改めてご連絡いたします。</p><div style="background:#f0f4ff;border-left:4px solid #667eea;padding:16px;border-radius:4px;margin:20px 0;"><ul style="margin:0;padding-left:20px;line-height:2;">${prefList}</ul></div><p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p></div></div>`,
    });
  } catch (err) { console.error('[email] sendBookingReceived error:', err); }
}

async function sendBookingConfirmedEmail(booking, slot) {
  const dateStr = formatDT(slot.start);
  const endStr = formatTime(slot.end);
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: booking.email,
      subject: '【面談スケジューラー】面談日時が確定しました',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;"><div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><h2 style="color:#27ae60;margin-top:0;">✅ 面談日時が確定しました</h2><p>${booking.name} さん</p><p>面談日時が以下の通り確定しました。</p><div style="background:#f0fff4;border-left:4px solid #27ae60;padding:16px;border-radius:4px;margin:20px 0;"><p style="margin:0;font-size:18px;font-weight:bold;color:#27ae60;">📅 ${dateStr}〜${endStr}</p></div><p>当日はどうぞよろしくお願いいたします。</p><p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p></div></div>`,
    });
  } catch (err) { console.error('[email] confirmed (employee) error:', err); }
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: booking.hostEmail,
      subject: `【面談スケジューラー】${booking.name}さんとの面談日時が確定しました`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;"><div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><h2 style="color:#27ae60;margin-top:0;">✅ 面談日時が確定しました</h2><p><strong>${booking.name}</strong>（${booking.email}）さんとの面談日時が確定しました。</p><div style="background:#f0fff4;border-left:4px solid #27ae60;padding:16px;border-radius:4px;margin:20px 0;"><p style="margin:0;font-size:18px;font-weight:bold;color:#27ae60;">📅 ${dateStr}〜${endStr}</p></div><p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p></div></div>`,
    });
  } catch (err) { console.error('[email] confirmed (host) error:', err); }
}

async function sendBookingChangedEmail(booking, newPreferences, slots) {
  const prefList = newPreferences.map((slotId, i) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return '';
    return `<li>第${i + 1}希望: ${formatDT(slot.start)}〜${formatTime(slot.end)}</li>`;
  }).join('');
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: booking.email,
      subject: '【面談スケジューラー】面談希望を変更しました',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;"><div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><h2 style="color:#e67e22;margin-top:0;">🔄 面談希望を変更しました</h2><p>${booking.name} さん</p><p>面談希望を以下の通り変更しました。</p><div style="background:#fff8f0;border-left:4px solid #e67e22;padding:16px;border-radius:4px;margin:20px 0;"><ul style="margin:0;padding-left:20px;line-height:2;">${prefList}</ul></div><p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p></div></div>`,
    });
  } catch (err) { console.error('[email] changed (employee) error:', err); }
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: booking.hostEmail,
      subject: `【面談スケジューラー】${booking.name}さんが面談希望を変更しました`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;"><div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><h2 style="color:#e67e22;margin-top:0;">🔄 面談希望が変更されました</h2><p><strong>${booking.name}</strong>（${booking.email}）さんが面談希望を変更しました。</p><div style="background:#fff8f0;border-left:4px solid #e67e22;padding:16px;border-radius:4px;margin:20px 0;"><ul style="margin:0;padding-left:20px;line-height:2;">${prefList}</ul></div><p>管理者ページから新しい希望を確認し、面談日時を確定してください。</p><p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p></div></div>`,
    });
  } catch (err) { console.error('[email] changed (host) error:', err); }
}

module.exports = { sendBookingReceivedEmail, sendBookingConfirmedEmail, sendBookingChangedEmail };
