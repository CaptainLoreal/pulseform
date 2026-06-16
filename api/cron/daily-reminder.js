const db = require('../../lib/db');
const { json } = require('../../lib/http');
const { webpush, ensure } = require('../../lib/push');

// Runs daily (Vercel Cron). Reminds users who haven't checked in today.
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; ?token= also accepted for manual runs.
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const tokenFromQuery = (req.query && req.query.token) || '';
  if (secret && authHeader !== `Bearer ${secret}` && tokenFromQuery !== secret) {
    return json(res, 401, { error: 'Unauthorized' });
  }
  if (!ensure()) return json(res, 503, { error: 'Push is not configured.' });
  try {
    const { rows } = await db.query(
      `select s.endpoint, s.p256dh, s.auth
       from push_subscriptions s
       where not exists (
         select 1 from checkins c where c.user_id = s.user_id and c.day = current_date
       )`);
    const payload = JSON.stringify({
      title: 'Pulseform',
      body: 'Good morning — log your check-in to tune today’s readiness.',
      url: '/',
      tag: 'daily-checkin',
    });
    let sent = 0, removed = 0;
    for (const r of rows) {
      try {
        await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.query('delete from push_subscriptions where endpoint = $1', [r.endpoint]);
          removed++;
        }
      }
    }
    return json(res, 200, { ok: true, candidates: rows.length, sent, removed });
  } catch (e) {
    return json(res, 500, { error: 'Reminder run failed.', detail: String(e.message || e) });
  }
};
