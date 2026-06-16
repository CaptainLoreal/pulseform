const db = require('../../lib/db');
const { verifyPassword, signSession, setSessionCookie } = require('../../lib/auth');
const { json, readBody } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
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
  } catch (err) {
    return json(res, 500, { error: 'Could not log in.', detail: String(err.message || err) });
  }
};
