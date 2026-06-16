const db = require('../../lib/db');
const { getUser } = require('../../lib/auth');
const { json, readBody } = require('../../lib/http');

// Save (or refresh) the current user's push subscription.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  try {
    const sub = await readBody(req);
    const endpoint = sub && sub.endpoint;
    const p256dh = sub && sub.keys && sub.keys.p256dh;
    const auth = sub && sub.keys && sub.keys.auth;
    if (!endpoint || !p256dh || !auth) return json(res, 400, { error: 'Invalid subscription.' });
    await db.query(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth)
       values ($1, $2, $3, $4)
       on conflict (endpoint) do update set user_id = $1, p256dh = $3, auth = $4`,
      [sess.uid, endpoint, p256dh, auth]);
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: 'Could not save subscription.', detail: String(e.message || e) });
  }
};
