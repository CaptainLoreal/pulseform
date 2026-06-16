const db = require('../../lib/db');
const { hashPassword, signSession, setSessionCookie } = require('../../lib/auth');
const { json, readBody } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const { email, password } = await readBody(req);
    const e = (email || '').trim().toLowerCase();
    if (!e || !/.+@.+\..+/.test(e)) return json(res, 400, { error: 'Enter a valid email.' });
    if (!password || password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters.' });

    const exists = await db.query('select 1 from users where email = $1', [e]);
    if (exists.rowCount) return json(res, 409, { error: 'That email already has an account. Try logging in.' });

    const hash = await hashPassword(password);
    const { rows } = await db.query(
      'insert into users (email, password_hash) values ($1, $2) returning id, email', [e, hash]);
    const user = rows[0];
    await db.query('insert into profiles (user_id) values ($1) on conflict do nothing', [user.id]);

    setSessionCookie(res, signSession({ uid: user.id, email: user.email }));
    return json(res, 201, { user: { id: user.id, email: user.email } });
  } catch (err) {
    return json(res, 500, { error: 'Could not create account.', detail: String(err.message || err) });
  }
};
