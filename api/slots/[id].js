const { getSlots, setSlots } = require('../_lib/redis');
const { requireAdmin } = require('../_lib/auth');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const slots = await getSlots();
    if (!slots.find(s => s.id === id)) return res.status(404).json({ error: 'スロットが見つかりません' });
    await setSlots(slots.filter(s => s.id !== id));
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
