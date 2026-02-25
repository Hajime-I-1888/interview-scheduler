const { getSlots, setSlots } = require('./_lib/redis');
const { requireAdmin } = require('./_lib/auth');

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
    const slots = await getSlots();
    return res.status(200).json(slots);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: '開始時刻と終了時刻が必要です' });

    const slots = await getSlots();
    const duplicate = slots.find(s => s.start === start);
    if (duplicate) return res.status(409).json({ error: '同じ開始時刻の枠が既に存在します' });

    const newSlot = { id: Date.now().toString(), start, end, booked: false };
    const updated = [...slots, newSlot].sort((a, b) => a.start.localeCompare(b.start));
    await setSlots(updated);
    return res.status(201).json(newSlot);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
