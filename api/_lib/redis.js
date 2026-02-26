const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SLOTS_KEY = 'interview:slots';
const BOOKINGS_KEY = 'interview:bookings';
const SETTINGS_KEY = 'interview:settings';

async function getSlots() {
  const data = await redis.get(SLOTS_KEY);
  if (!data) return [];
  if (typeof data === 'string') return JSON.parse(data);
  return data;
}

async function getBookings() {
  const data = await redis.get(BOOKINGS_KEY);
  if (!data) return [];
  if (typeof data === 'string') return JSON.parse(data);
  return data;
}

async function getSettings() {
  const data = await redis.get(SETTINGS_KEY);
  if (!data) return { hostEmails: '' };
  if (typeof data === 'string') return JSON.parse(data);
  return data;
}

async function setSlots(slots) {
  await redis.set(SLOTS_KEY, JSON.stringify(slots));
}

async function setBookings(bookings) {
  await redis.set(BOOKINGS_KEY, JSON.stringify(bookings));
}

// 管理者ページのポーリング用：変更タイムスタンプを更新
async function touchLastModified() {
  await redis.set('interview:lastModified', Date.now().toString());
}

async function getLastModified() {
  const val = await redis.get('interview:lastModified');
  return val ? val.toString() : '0';
}

module.exports = {
  redis,
  getSlots, getBookings, getSettings,
  setSlots, setBookings,
  touchLastModified, getLastModified,
};
