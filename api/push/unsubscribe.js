const db = require('../../lib/db');
const { getUser } = require('../../lib/auth');
const { json, readBody } = require('../../lib/http');

// Remove a push subscription (by endpoint, or all for the user).
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  try {
    const { endpoint } = await readBody(req);
    if (endpoint) await db.query('delete from push_subscriptions where user_id = $1 and endpoint = $2', [sess.uid, endpoint]);
    else await db.query('delete from push_subscriptions where user_id = $1', [sess.uid]);
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: 'Could not unsubscribe.', detail: String(e.message || e) });
  }
};
