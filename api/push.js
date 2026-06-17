// Push router: vapid / subscribe / unsubscribe / test — one function instead of four.
// Frontend calls /api/push?action=vapid|subscribe|unsubscribe|test (or /api/push/<action>).
const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json, readBody } = require('../lib/http');
const { webpush, ensure } = require('../lib/push');

function resolveAction(req) {
  const q = (req.query && req.query.action) || '';
  if (q) return String(q);
  const m = String(req.url || '').match(/\/api\/push\/([a-z]+)/i);
  return m ? m[1] : '';
}

async function getVapid(req, res) {
  return json(res, 200, { publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

async function subscribe(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
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
}

async function unsubscribe(req, res) {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  const { endpoint } = await readBody(req);
  if (endpoint) await db.query('delete from push_subscriptions where user_id = $1 and endpoint = $2', [sess.uid, endpoint]);
  else await db.query('delete from push_subscriptions where user_id = $1', [sess.uid]);
  return json(res, 200, { ok: true });
}

async function test(req, res) {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  if (!ensure()) return json(res, 503, { error: 'Push is not configured on the server yet.' });
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
}

module.exports = async (req, res) => {
  const action = resolveAction(req);
  try {
    if (action === 'vapid') return await getVapid(req, res);
    if (action === 'subscribe') return await subscribe(req, res);
    if (action === 'unsubscribe') return await unsubscribe(req, res);
    if (action === 'test') return await test(req, res);
    return json(res, 400, { error: 'Unknown push action.' });
  } catch (err) {
    return json(res, 500, { error: 'Push failed.', detail: String(err.message || err) });
  }
};
