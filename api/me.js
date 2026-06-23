const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json } = require('../lib/http');

// Returns the current user + their profile (or { user: null } when logged out).
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 200, { user: null });
  try {
    const u = await db.query(
      'select id, email, role, suspended from users where id = $1', [sess.uid]);
    const row = u.rows[0];
    if (!row || row.suspended) return json(res, 200, { user: null });
    const { rows } = await db.query(
      `select name, sex, age, height, weight, rest_hr, experience, weekly, goal, injuries, pain, onboarded
       from profiles where user_id = $1`, [sess.uid]);
    return json(res, 200, {
      user: { id: row.id, email: row.email, role: row.role },
      profile: rows[0] || null,
    });
  } catch (err) {
    return json(res, 500, { error: 'Could not load profile.', detail: String(err.message || err) });
  }
};
