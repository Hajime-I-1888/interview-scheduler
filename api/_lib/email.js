const nodemailer = require('nodemailer');

// Gmail SMTP トランスポーター
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,        // 送信元GmailアドレスS
    pass: process.env.GMAIL_APP_PASSWORD, // Googleアカウントのアプリパスワード
  },
});

const FROM_NAME = process.env.FROM_NAME || '面談スケジューラー';
const FROM_EMAIL = process.env.GMAIL_USER;

// ── ユーティリティ ─────────────────────────────
function formatDT(isoStr) {
  return new Date(isoStr).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
}
function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

/**
 * booking.hostEmails（カンマ区切り文字列）からメールアドレス配列を取得
 * 旧形式の booking.hostEmail にも対応
 */
function getHostEmailList(booking) {
  if (booking.hostEmails && booking.hostEmails.trim()) {
    return booking.hostEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'));
  }
  if (booking.hostEmail && booking.hostEmail.trim()) {
    return [booking.hostEmail.trim()];
  }
  return [];
}

/**
 * 1通送信して結果を返す（エラーを呼び出し元に伝える）
 */
async function sendOne(to, subject, html) {
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

// ── 希望提出メール ────────────────────────────────
async function sendBookingReceivedEmail(booking, slots) {
  const prefList = booking.preferences.map((slotId, i) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return '';
    return `<li>第${i + 1}希望: ${formatDT(slot.start)}〜${formatTime(slot.end)}</li>`;
  }).join('');

  const empHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#667eea;margin-top:0;">📅 面談希望を受け付けました</h2>
        <p>${booking.name} さん</p>
        <p>以下の内容で面談希望を受け付けました。<br>面談日時が確定しましたら、改めてご連絡いたします。</p>
        <div style="background:#f0f4ff;border-left:4px solid #667eea;padding:16px;border-radius:4px;margin:20px 0;">
          <ul style="margin:0;padding-left:20px;line-height:2;">${prefList}</ul>
        </div>
        <p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p>
      </div>
    </div>`;

  const hostHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#667eea;margin-top:0;">📅 面談希望が提出されました</h2>
        <p><strong>${booking.name}</strong>（${booking.email}）さんが面談希望を提出しました。</p>
        <div style="background:#f0f4ff;border-left:4px solid #667eea;padding:16px;border-radius:4px;margin:20px 0;">
          <ul style="margin:0;padding-left:20px;line-height:2;">${prefList}</ul>
        </div>
        <p>管理者ページから面談日時を確定してください。</p>
        <p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p>
      </div>
    </div>`;

  const errors = [];

  // 社員へ
  try {
    await sendOne(booking.email, '【面談スケジューラー】面談希望を受け付けました', empHtml);
  } catch (err) {
    errors.push(`社員宛メール失敗(${booking.email}): ${err.message}`);
    console.error('[email] received - employee:', err.message);
  }

  // ホストへ（全員）
  const hostList = getHostEmailList(booking);
  for (const hostEmail of hostList) {
    try {
      await sendOne(hostEmail, `【面談スケジューラー】${booking.name}さんが面談希望を提出しました`, hostHtml);
    } catch (err) {
      errors.push(`ホスト宛メール失敗(${hostEmail}): ${err.message}`);
      console.error('[email] received - host:', err.message);
    }
  }

  return errors;
}

// ── 日時確定メール ─────────────────────────────────
async function sendBookingConfirmedEmail(booking, slot) {
  const dateStr = formatDT(slot.start);
  const endStr = formatTime(slot.end);

  const empHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#27ae60;margin-top:0;">✅ 面談日時が確定しました</h2>
        <p>${booking.name} さん</p>
        <p>面談日時が以下の通り確定しました。</p>
        <div style="background:#f0fff4;border-left:4px solid #27ae60;padding:16px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#27ae60;">📅 ${dateStr}〜${endStr}</p>
        </div>
        <p>当日はどうぞよろしくお願いいたします。</p>
        <p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p>
      </div>
    </div>`;

  const hostHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#27ae60;margin-top:0;">✅ 面談日時が確定しました</h2>
        <p><strong>${booking.name}</strong>（${booking.email}）さんとの面談日時が確定しました。</p>
        <div style="background:#f0fff4;border-left:4px solid #27ae60;padding:16px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#27ae60;">📅 ${dateStr}〜${endStr}</p>
        </div>
        <p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p>
      </div>
    </div>`;

  const errors = [];

  // 社員へ
  try {
    await sendOne(booking.email, '【面談スケジューラー】面談日時が確定しました', empHtml);
  } catch (err) {
    errors.push(`社員宛メール失敗(${booking.email}): ${err.message}`);
    console.error('[email] confirmed - employee:', err.message);
  }

  // ホストへ（全員）
  const hostList = getHostEmailList(booking);
  for (const hostEmail of hostList) {
    try {
      await sendOne(hostEmail, `【面談スケジューラー】${booking.name}さんとの面談日時が確定しました`, hostHtml);
    } catch (err) {
      errors.push(`ホスト宛メール失敗(${hostEmail}): ${err.message}`);
      console.error('[email] confirmed - host:', err.message);
    }
  }

  return errors;
}

// ── 希望変更メール ─────────────────────────────────
async function sendBookingChangedEmail(booking, newPreferences, slots) {
  const prefList = newPreferences.map((slotId, i) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return '';
    return `<li>第${i + 1}希望: ${formatDT(slot.start)}〜${formatTime(slot.end)}</li>`;
  }).join('');

  const empHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#e67e22;margin-top:0;">🔄 面談希望を変更しました</h2>
        <p>${booking.name} さん</p>
        <p>面談希望を以下の通り変更しました。<br>改めて日時が確定しましたら、ご連絡いたします。</p>
        <div style="background:#fff8f0;border-left:4px solid #e67e22;padding:16px;border-radius:4px;margin:20px 0;">
          <ul style="margin:0;padding-left:20px;line-height:2;">${prefList}</ul>
        </div>
        <p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p>
      </div>
    </div>`;

  const hostHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#e67e22;margin-top:0;">🔄 面談希望が変更されました</h2>
        <p><strong>${booking.name}</strong>（${booking.email}）さんが面談希望を変更しました。</p>
        <div style="background:#fff8f0;border-left:4px solid #e67e22;padding:16px;border-radius:4px;margin:20px 0;">
          <ul style="margin:0;padding-left:20px;line-height:2;">${prefList}</ul>
        </div>
        <p>管理者ページから新しい希望を確認し、面談日時を確定してください。</p>
        <p style="color:#888;font-size:13px;">このメールは自動送信されています。返信はできません。</p>
      </div>
    </div>`;

  const errors = [];

  // 社員へ
  try {
    await sendOne(booking.email, '【面談スケジューラー】面談希望を変更しました', empHtml);
  } catch (err) {
    errors.push(`社員宛メール失敗(${booking.email}): ${err.message}`);
    console.error('[email] changed - employee:', err.message);
  }

  // ホストへ（全員）
  const hostList = getHostEmailList(booking);
  for (const hostEmail of hostList) {
    try {
      await sendOne(hostEmail, `【面談スケジューラー】${booking.name}さんが面談希望を変更しました`, hostHtml);
    } catch (err) {
      errors.push(`ホスト宛メール失敗(${hostEmail}): ${err.message}`);
      console.error('[email] changed - host:', err.message);
    }
  }

  return errors;
}

module.exports = {
  sendBookingReceivedEmail,
  sendBookingConfirmedEmail,
  sendBookingChangedEmail,
};
