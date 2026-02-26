const { getSlots, getBookings, setBookings, getSettings, touchLastModified } = require('./_lib/redis');
const { requireAdmin } = require('./_lib/auth');
const { sendBookingReceivedEmail } = require('./_lib/email');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { email, lastModified } = req.query;

    // 管理者ポーリング用：lastModified より新しい更新があるか確認
    if (lastModified !== undefined) {
      const { getLastModified } = require('./_lib/redis');
      if (!requireAdmin(req, res)) return;
      const current = await getLastModified();
      const [bookings, slots] = await Promise.all([getBookings(), getSlots()]);
      return res.status(200).json({ lastModified: current, bookings, slots });
    }

    // 社員が自分の予約をメールで検索
    if (email) {
      const bookings = await getBookings();
      const booking = bookings.find(b => b.email === email && !b.cancelled);
      if (!booking) return res.status(404).json({ error: '予約が見つかりません' });
      return res.status(200).json(booking);
    }

    // 管理者：全予約一覧
    if (!requireAdmin(req, res)) return;
    const bookings = await getBookings();
    return res.status(200).json(bookings);
  }

  if (req.method === 'POST') {
    const { name, email, preferences } = req.body || {};
    if (!name || !email || !preferences || preferences.length === 0) {
      return res.status(400).json({ error: '必須項目が不足しています' });
    }

    const [slots, bookings, settings] = await Promise.all([
      getSlots(), getBookings(), getSettings(),
    ]);

    const existing = bookings.find(b => b.email === email && !b.cancelled);
    if (existing) return res.status(409).json({ error: '既に予約が存在します', booking: existing });

    const newBooking = {
      id: Date.now().toString(),
      name,
      email,
      // ホストメールは設定から取得して保存
      hostEmails: settings.hostEmails || '',
      preferences,
      confirmed: false,
      confirmedSlotId: null,
      cancelled: false,
      createdAt: new Date().toISOString(),
      changedAt: null,
    };

    await setBookings([...bookings, newBooking]);
    await touchLastModified();

    // メール送信（エラーがあってもレスポンスは返す）
    const emailErrors = await sendBookingReceivedEmail(newBooking, slots);
    const response = { ...newBooking };
    if (emailErrors.length > 0) response._emailWarnings = emailErrors;

    return res.status(201).json(response);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
