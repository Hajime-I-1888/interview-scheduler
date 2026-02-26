const { redis } = require('./_lib/redis');
const { requireAdmin } = require('./_lib/auth');

const SETTINGS_KEY = 'interview:settings';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function getSettingsData() {
  const data = await redis.get(SETTINGS_KEY);
  if (!data) return { hostEmails: '' };
  if (typeof data === 'string') return JSON.parse(data);
  return data;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: ホスト設定を取得（公開 - 社員ページから予約時に参照）
  if (req.method === 'GET') {
    const settings = await getSettingsData();
    return res.status(200).json(settings);
  }

  // POST: ホスト設定を保存（管理者のみ）
  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const { hostEmails } = req.body || {};
    const settings = { hostEmails: (hostEmails || '').trim() };
    await redis.set(SETTINGS_KEY, JSON.stringify(settings));
    return res.status(200).json(settings);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
