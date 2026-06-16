// Session + password helpers. Signed JWT stored in an httpOnly cookie.
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const COOKIE = 'pf_session';
const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const hashPassword = (pw) => bcrypt.hash(pw, 10);
const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);

const signSession = (payload) => jwt.sign(payload, SECRET, { expiresIn: '30d' });

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; Secure`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const i = s.indexOf('=');
        return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
      })
  );
}

// Returns { uid, email } or null.
function getUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

module.exports = {
  hashPassword, verifyPassword, signSession,
  setSessionCookie, clearSessionCookie, getUser,
};
