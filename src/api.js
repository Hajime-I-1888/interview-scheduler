let adminToken = null;

export function setAdminToken(token) { adminToken = token; }
export function clearAdminToken() { adminToken = null; }
export function hasAdminToken() { return !!adminToken; }

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let errMsg = 'エラーが発生しました';
    try { const json = await res.json(); errMsg = json.error || errMsg; } catch {}
    const err = new Error(errMsg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function adminLogin(password) {
  const data = await apiFetch('/api/auth', { method: 'POST', body: JSON.stringify({ password }) });
  setAdminToken(data.token);
  return data;
}

export async function fetchSlots() { return apiFetch('/api/slots'); }
export async function createSlot(start, end) {
  return apiFetch('/api/slots', { method: 'POST', body: JSON.stringify({ start, end }) });
}
export async function deleteSlot(id) { return apiFetch(`/api/slots/${id}`, { method: 'DELETE' }); }

export async function fetchBookings() { return apiFetch('/api/bookings'); }
export async function fetchBookingByEmail(email) {
  return apiFetch(`/api/bookings?email=${encodeURIComponent(email)}`);
}
export async function createBooking(data) {
  return apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
}
export async function confirmBookingSlot(bookingId, slotId) {
  return apiFetch(`/api/bookings/${bookingId}`, { method: 'PUT', body: JSON.stringify({ action: 'confirm', slotId }) });
}
export async function changeBookingPreferences(bookingId, preferences, email) {
  return apiFetch(`/api/bookings/${bookingId}`, { method: 'PUT', body: JSON.stringify({ action: 'change', preferences, email }) });
}
