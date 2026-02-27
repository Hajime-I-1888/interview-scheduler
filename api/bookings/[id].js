const { redis, getSlots, setSlots, getBookings, setBookings, touchLastModified } = require('../_lib/redis');
const { requireAdmin } = require('../_lib/auth');
const { sendBookingConfirmedEmail, sendBookingChangedEmail } = require('../_lib/email');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const { action, slotId, preferences, email } = req.body || {};

  // ─── 日時確定（管理者） ────────────────────────────
  if (action === 'confirm') {
    if (!requireAdmin(req, res)) return;
    if (!slotId) return res.status(400).json({ error: 'slotId が必要です' });

    const lockKey = `lock:slot:${slotId}`;
    const locked = await redis.set(lockKey, '1', { nx: true, ex: 5 });
    if (!locked) return res.status(409).json({ error: '別の確定処理が進行中です。少し待ってから再試行してください。' });

    try {
      const [slots, bookings] = await Promise.all([getSlots(), getBookings()]);

      const slot = slots.find(s => s.id === slotId);
      if (!slot) return res.status(404).json({ error: 'スロットが見つかりません' });
      if (slot.booked) return res.status(409).json({ error: 'このスロットは既に予約済みです' });

      const booking = bookings.find(b => b.id === id);
      if (!booking) return res.status(404).json({ error: '予約が見つかりません' });

      // 以前の確定スロットを解放
      let updatedSlots = slots.map(s =>
        s.id === booking.confirmedSlotId && booking.confirmedSlotId !== slotId
          ? { ...s, booked: false } : s
      );
      updatedSlots = updatedSlots.map(s => s.id === slotId ? { ...s, booked: true } : s);

      const updatedBooking = {
        ...booking,
        confirmed: true,
        confirmedSlotId: slotId,
        confirmedAt: new Date().toISOString(),
      };
      const updatedBookings = bookings.map(b => b.id === id ? updatedBooking : b);

      await Promise.all([setSlots(updatedSlots), setBookings(updatedBookings)]);
      await touchLastModified();

      const emailErrors = await sendBookingConfirmedEmail(updatedBooking, slot);
      const response = { ...updatedBooking };
      if (emailErrors.length > 0) response._emailWarnings = emailErrors;

      return res.status(200).json(response);
    } finally {
      await redis.del(lockKey);
    }
  }

  // ─── 希望変更（社員） ──────────────────────────────
  if (action === 'change') {
    if (!email) return res.status(400).json({ error: 'email が必要です' });
    if (!preferences || preferences.length === 0) return res.status(400).json({ error: '希望日時を選択してください' });

    const lockKey = `lock:booking:${id}`;
    const locked = await redis.set(lockKey, '1', { nx: true, ex: 5 });
    if (!locked) return res.status(409).json({ error: '別の処理が進行中です。少し待ってから再試行してください。' });

    try {
      const [slots, bookings] = await Promise.all([getSlots(), getBookings()]);

      const booking = bookings.find(b => b.id === id);
      if (!booking) return res.status(404).json({ error: '予約が見つかりません' });
      if (booking.email !== email) return res.status(403).json({ error: '権限がありません' });

      let updatedSlots = slots;
      if (booking.confirmedSlotId) {
        updatedSlots = slots.map(s =>
          s.id === booking.confirmedSlotId ? { ...s, booked: false } : s
        );
      }

      const updatedBooking = {
        ...booking,
        preferences,
        confirmed: false,
        confirmedSlotId: null,
        changedAt: new Date().toISOString(),
      };
      const updatedBookings = bookings.map(b => b.id === id ? updatedBooking : b);

      await Promise.all([setSlots(updatedSlots), setBookings(updatedBookings)]);
      await touchLastModified();

      const emailErrors = await sendBookingChangedEmail(updatedBooking, preferences, slots);
      const response = { ...updatedBooking };
      if (emailErrors.length > 0) response._emailWarnings = emailErrors;

      return res.status(200).json(response);
    } finally {
      await redis.del(lockKey);
    }
  }

  // ─── 予約削除（管理者・ソフトデリート） ────────────────
  if (action === 'delete' || req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const [slots, bookings] = await Promise.all([getSlots(), getBookings()]);
    const booking = bookings.find(b => b.id === id);
    if (!booking) return res.status(404).json({ error: '予約が見つかりません' });

    // 確定済みのスロットを解放
    let updatedSlots = slots;
    if (booking.confirmedSlotId) {
      updatedSlots = slots.map(s =>
        s.id === booking.confirmedSlotId ? { ...s, booked: false } : s
      );
    }

    const updatedBooking = { ...booking, cancelled: true, cancelledAt: new Date().toISOString() };
    const updatedBookings = bookings.map(b => b.id === id ? updatedBooking : b);
    await Promise.all([setSlots(updatedSlots), setBookings(updatedBookings)]);
    await touchLastModified();
    return res.status(200).json({ success: true });
  }

  // ─── 予約復元（管理者） ─────────────────────────────
  if (action === 'restore') {
    if (!requireAdmin(req, res)) return;
    const [slots, bookings] = await Promise.all([getSlots(), getBookings()]);
    const booking = bookings.find(b => b.id === id);
    if (!booking) return res.status(404).json({ error: '予約が見つかりません' });

    // 確定スロットがあれば再度 booked に戻す
    let updatedSlots = slots;
    if (booking.confirmedSlotId) {
      updatedSlots = slots.map(s =>
        s.id === booking.confirmedSlotId ? { ...s, booked: true } : s
      );
    }

    const updatedBooking = { ...booking, cancelled: false, cancelledAt: null };
    const updatedBookings = bookings.map(b => b.id === id ? updatedBooking : b);
    await Promise.all([setSlots(updatedSlots), setBookings(updatedBookings)]);
    await touchLastModified();
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: '無効な action です' });
};
