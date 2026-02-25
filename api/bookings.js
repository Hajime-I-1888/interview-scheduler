const { getSlots, getBookings, setBookings } = require('./_lib/redis');
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
    const { email } = req.query;
    if (email) {
      const bookings = await getBookings();
      const booking = bookings.find(b => b.email === email && !b.cancelled);
      if (!booking) return res.status(404).json({ error: '予約が見つかりません' });
      return res.status(200).json(booking);
    }
    if (!requireAdmin(req, res)) return;
    const bookings = await getBookings();
    return res.status(200).json(bookings);
  }

  if (req.method === 'POST') {
    const { name, email, hostEmail, preferences } = req.body || {};
    if (!name || !email || !preferences || preferences.length === 0) {
      return res.status(400).json({ error: '必須項目が不足しています' });
    }
    const [slots, bookings] = await Promise.all([getSlots(), getBookings()]);
    const existing = bookings.find(b => b.email === email && !b.cancelled);
    if (existing) return res.status(409).json({ error: '既に予約が存在します', booking: existing });

    const newBooking = {
      id: Date.now().toString(), name, email,
      hostEmail: hostEmail || 'host@company.com',
      preferences, confirmed: false, confirmedSlotId: null,
      cancelled: false, createdAt: new Date().toISOString(), changedAt: null,
    };
    await setBookings([...bookings, newBooking]);
    sendBookingReceivedEmail(newBooking, slots).catch(console.error);
    return res.status(201).json(newBooking);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
