const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-please-set-env';

function generateToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

function requireAdmin(req, res) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: '認証が必要です' });
    return false;
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    res.status(401).json({ error: '無効または期限切れのトークンです' });
    return false;
  }
  return true;
}

module.exports = { generateToken, verifyToken, getTokenFromRequest, requireAdmin };
