// Session + password helpers. Signed JWT stored in an httpOnly cookie.
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

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

// Loads role + suspended state from the DB. Cheap (one query) and lets role
// changes / suspensions take effect immediately without waiting for the JWT to expire.
async function loadUserState(uid) {
  const { rows } = await db.query(
    'select id, email, role, suspended from users where id = $1', [uid]);
  return rows[0] || null;
}

// Returns the admin user row, or null after writing a 401/403 response.
async function requireAdmin(req, res) {
  const sess = getUser(req);
  if (!sess) { res.statusCode = 401; res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not signed in.' })); return null; }
  const row = await loadUserState(sess.uid);
  if (!row || row.suspended || row.role !== 'admin') {
    res.statusCode = 403; res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Admin access required.' })); return null;
  }
  return row;
}

module.exports = {
  hashPassword, verifyPassword, signSession,
  setSessionCookie, clearSessionCookie, getUser,
  loadUserState, requireAdmin,
};
