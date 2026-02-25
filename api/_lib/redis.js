const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SLOTS_KEY = 'interview:slots';
const BOOKINGS_KEY = 'interview:bookings';

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

async function setSlots(slots) {
  await redis.set(SLOTS_KEY, JSON.stringify(slots));
}

async function setBookings(bookings) {
  await redis.set(BOOKINGS_KEY, JSON.stringify(bookings));
}

module.exports = { redis, getSlots, getBookings, setSlots, setBookings };
