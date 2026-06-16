const db = require('../../lib/db');
const { getUser } = require('../../lib/auth');
const { json } = require('../../lib/http');
const { webpush, ensure } = require('../../lib/push');

// Send a test notification to the current user's devices.
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  if (!ensure()) return json(res, 503, { error: 'Push is not configured on the server yet.' });
  try {
    const { rows } = await db.query('select endpoint, p256dh, auth from push_subscriptions where user_id = $1', [sess.uid]);
    if (!rows.length) return json(res, 400, { error: 'No subscription yet — enable notifications first.' });
    const payload = JSON.stringify({ title: 'Pulseform', body: 'Test notification — you’re all set.', url: '/' });
    let sent = 0;
    for (const r of rows) {
      try {
        await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.query('delete from push_subscriptions where endpoint = $1', [r.endpoint]);
        }
      }
    }
    return json(res, 200, { ok: true, sent });
  } catch (e) {
    return json(res, 500, { error: 'Could not send test.', detail: String(e.message || e) });
  }
};
