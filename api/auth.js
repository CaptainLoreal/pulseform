// Auth router: signup / login / logout — one serverless function instead of three.
// Frontend calls /api/auth?action=signup|login|logout (or /api/auth/<action>).
const db = require('../lib/db');
const { hashPassword, verifyPassword, signSession, setSessionCookie, clearSessionCookie } = require('../lib/auth');
const { json, readBody } = require('../lib/http');

function resolveAction(req) {
  const q = (req.query && req.query.action) || '';
  if (q) return String(q);
  // also accept /api/auth/<action> rewrites
  const m = String(req.url || '').match(/\/api\/auth\/([a-z]+)/i);
  return m ? m[1] : '';
}

async function signup(req, res) {
  const { email, password } = await readBody(req);
  const e = (email || '').trim().toLowerCase();
  if (!e || !/.+@.+\..+/.test(e)) return json(res, 400, { error: 'Enter a valid email.' });
  if (!password || password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters.' });
  const exists = await db.query('select 1 from users where email = $1', [e]);
  if (exists.rowCount) return json(res, 409, { error: 'That email already has an account. Try logging in.' });
  const hash = await hashPassword(password);
  const { rows } = await db.query('insert into users (email, password_hash) values ($1, $2) returning id, email', [e, hash]);
  const user = rows[0];
  await db.query('insert into profiles (user_id) values ($1) on conflict do nothing', [user.id]);
  setSessionCookie(res, signSession({ uid: user.id, email: user.email }));
  return json(res, 201, { user: { id: user.id, email: user.email } });
}

async function login(req, res) {
  const { email, password } = await readBody(req);
  const e = (email || '').trim().toLowerCase();
  if (!e || !password) return json(res, 400, { error: 'Email and password required.' });
  const { rows } = await db.query('select id, email, password_hash from users where email = $1', [e]);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json(res, 401, { error: 'Wrong email or password.' });
  }
  setSessionCookie(res, signSession({ uid: user.id, email: user.email }));
  return json(res, 200, { user: { id: user.id, email: user.email } });
}

async function logout(req, res) {
  clearSessionCookie(res);
  return json(res, 200, { ok: true });
}

module.exports = async (req, res) => {
  const action = resolveAction(req);
  try {
    if (action === 'signup') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      return await signup(req, res);
    }
    if (action === 'login') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      return await login(req, res);
    }
    if (action === 'logout') return await logout(req, res);
    return json(res, 400, { error: 'Unknown auth action.' });
  } catch (err) {
    return json(res, 500, { error: 'Auth failed.', detail: String(err.message || err) });
  }
};
