// Admin router: full back-office in one serverless function (keeps us under
// Vercel's 12-function cap on Hobby). Dispatched by ?action= or /api/admin/<action>.
//
// Actions:
//   stats             GET    — aggregate counts + recent signup series
//   users             GET    — paginated list (?q=, ?page=, ?pageSize=)
//   user              GET    — full detail for one user (?id=)
//   suspend           POST   — ?id= body { reason }
//   unsuspend         POST   — ?id=
//   delete-user       DELETE — ?id= (cascade-deletes + best-effort blob purge)
//   reset-password    POST   — ?id= body { password }
//   set-role          POST   — ?id= body { role: 'user' | 'admin' }
//   delete-video      DELETE — ?id=<videoId>
//   delete-checkin    DELETE — ?id=<checkinId>
//   delete-run        DELETE — ?id=<runId>
//   push-user         POST   — ?id= body { title, body, url? }
//   push-all          POST   — body { title, body, url? }
//
// Every action checks requireAdmin(req,res). Admins cannot suspend/demote/delete
// themselves or other admins (prevents lockout). Suspension takes effect at the
// next /api/me / login — the JWT remains valid until then.

const db = require('../lib/db');
const { hashPassword, requireAdmin } = require('../lib/auth');
const { json, readBody } = require('../lib/http');
const { webpush, ensure } = require('../lib/push');

function resolveAction(req) {
  const q = (req.query && req.query.action) || '';
  if (q) return String(q);
  const m = String(req.url || '').match(/\/api\/admin\/([a-z-]+)/i);
  return m ? m[1] : '';
}

const qid = (req) => (req.query && req.query.id) || '';

// ---- Dashboard ----------------------------------------------------------

async function stats(req, res) {
  const [users, profiles, checkinsToday, checkinsTotal, runs, videos, subs, suspended, admins, signupSeries] = await Promise.all([
    db.query('select count(*)::int as n from users'),
    db.query('select count(*)::int as n from profiles where onboarded = true'),
    db.query('select count(*)::int as n from checkins where day = current_date'),
    db.query('select count(*)::int as n from checkins'),
    db.query(`select count(*)::int as n from runs`).catch(() => ({ rows: [{ n: 0 }] })),
    db.query(`select count(*)::int as n from videos`).catch(() => ({ rows: [{ n: 0 }] })),
    db.query('select count(*)::int as n from push_subscriptions'),
    db.query('select count(*)::int as n from users where suspended = true'),
    db.query(`select count(*)::int as n from users where role = 'admin'`),
    db.query(
      `select to_char(d, 'YYYY-MM-DD') as day,
              coalesce(c, 0)::int as count
       from generate_series(current_date - interval '13 days', current_date, '1 day') d
       left join (
         select date_trunc('day', created_at)::date as day, count(*) as c
         from users
         where created_at >= current_date - interval '13 days'
         group by 1
       ) s on s.day = d::date
       order by d`),
  ]);
  return json(res, 200, {
    users: users.rows[0].n,
    onboarded: profiles.rows[0].n,
    checkins_today: checkinsToday.rows[0].n,
    checkins_total: checkinsTotal.rows[0].n,
    runs: runs.rows[0].n,
    videos: videos.rows[0].n,
    push_subscriptions: subs.rows[0].n,
    suspended: suspended.rows[0].n,
    admins: admins.rows[0].n,
    signups_14d: signupSeries.rows,
  });
}

// ---- User list ----------------------------------------------------------

async function usersList(req, res) {
  const q = String((req.query && req.query.q) || '').trim().toLowerCase();
  const page = Math.max(0, parseInt((req.query && req.query.page) || '0', 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query && req.query.pageSize) || '25', 10) || 25));
  const offset = page * pageSize;
  const where = q ? `where u.email ilike $1` : '';
  const params = q ? [`%${q}%`, pageSize, offset] : [pageSize, offset];
  const limitOff = q ? '$2 offset $3' : '$1 offset $2';

  const list = await db.query(
    `select u.id, u.email, u.role, u.suspended, u.suspended_reason, u.created_at,
            p.name, p.onboarded,
            (select max(day) from checkins c where c.user_id = u.id) as last_checkin_day,
            (select count(*) from checkins c where c.user_id = u.id)::int as checkins_count
     from users u
     left join profiles p on p.user_id = u.id
     ${where}
     order by u.created_at desc
     limit ${limitOff}`, params);

  const total = await db.query(
    `select count(*)::int as n from users u ${where}`, q ? [`%${q}%`] : []);

  return json(res, 200, { users: list.rows, total: total.rows[0].n, page, pageSize });
}

// ---- User detail --------------------------------------------------------

async function userDetail(req, res) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  const u = await db.query(
    `select id, email, role, suspended, suspended_at, suspended_reason, created_at
     from users where id = $1`, [id]);
  if (!u.rowCount) return json(res, 404, { error: 'User not found.' });

  const [profile, checkins, runs, videos, subs] = await Promise.all([
    db.query(
      `select name, sex, age, height, weight, rest_hr, experience, weekly, goal, injuries, pain, onboarded, updated_at
       from profiles where user_id = $1`, [id]),
    db.query(
      `select id, day, sleep, soreness, pain, symptoms, run_ready, created_at
       from checkins where user_id = $1 order by day desc limit 60`, [id]),
    db.query(
      `select id, source, started_at, distance_m, duration_s, avg_hr, max_hr, avg_cadence, avg_gct, avg_vo, filename
       from runs where user_id = $1 order by coalesce(started_at, created_at) desc limit 30`, [id])
        .catch(() => ({ rows: [] })),
    db.query(
      `select id, kind, recorded_at, duration_s, width, height, notes, url
       from videos where user_id = $1 order by recorded_at desc limit 30`, [id])
        .catch(() => ({ rows: [] })),
    db.query('select count(*)::int as n from push_subscriptions where user_id = $1', [id]),
  ]);

  return json(res, 200, {
    user: u.rows[0],
    profile: profile.rows[0] || null,
    checkins: checkins.rows,
    runs: runs.rows,
    videos: videos.rows,
    push_subscriptions: subs.rows[0].n,
  });
}

// ---- Moderation: user-level --------------------------------------------

async function suspend(req, res, admin) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  if (id === admin.id) return json(res, 400, { error: 'You cannot suspend your own account.' });
  const target = await db.query('select role from users where id = $1', [id]);
  if (!target.rowCount) return json(res, 404, { error: 'User not found.' });
  if (target.rows[0].role === 'admin') return json(res, 400, { error: 'Cannot suspend another admin. Demote them first.' });
  const { reason } = await readBody(req);
  await db.query(
    `update users set suspended = true, suspended_at = now(), suspended_reason = $2 where id = $1`,
    [id, (reason || '').slice(0, 500) || null]);
  return json(res, 200, { ok: true });
}

async function unsuspend(req, res) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  await db.query(
    `update users set suspended = false, suspended_at = null, suspended_reason = null where id = $1`,
    [id]);
  return json(res, 200, { ok: true });
}

async function deleteUser(req, res, admin) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  if (id === admin.id) return json(res, 400, { error: 'You cannot delete your own account.' });
  const target = await db.query('select role from users where id = $1', [id]);
  if (!target.rowCount) return json(res, 404, { error: 'User not found.' });
  if (target.rows[0].role === 'admin') return json(res, 400, { error: 'Cannot delete another admin. Demote them first.' });
  try {
    const { rows } = await db.query('select url from videos where user_id = $1 and url is not null', [id]);
    if (rows.length) {
      const { del } = require('@vercel/blob');
      await Promise.all(rows.map(r => del(r.url).catch(() => {})));
    }
  } catch (e) { /* table may not exist yet — ignore */ }
  await db.query('delete from users where id = $1', [id]);
  return json(res, 200, { ok: true });
}

async function resetPassword(req, res) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  const { password } = await readBody(req);
  if (!password || password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters.' });
  const hash = await hashPassword(password);
  const r = await db.query('update users set password_hash = $2 where id = $1', [id, hash]);
  if (!r.rowCount) return json(res, 404, { error: 'User not found.' });
  return json(res, 200, { ok: true });
}

async function setRole(req, res, admin) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  const { role } = await readBody(req);
  if (role !== 'admin' && role !== 'user') return json(res, 400, { error: "Role must be 'admin' or 'user'." });
  if (id === admin.id && role !== 'admin') return json(res, 400, { error: 'You cannot demote your own account.' });
  const r = await db.query('update users set role = $2 where id = $1', [id, role]);
  if (!r.rowCount) return json(res, 404, { error: 'User not found.' });
  return json(res, 200, { ok: true });
}

// ---- Moderation: content -----------------------------------------------

async function deleteVideo(req, res) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  const { rows } = await db.query('select url from videos where id = $1', [id]);
  await db.query('delete from videos where id = $1', [id]);
  const row = rows[0];
  if (row && row.url) {
    try { const { del } = require('@vercel/blob'); await del(row.url); } catch (e) { /* ignore */ }
  }
  return json(res, 200, { ok: true });
}

async function deleteCheckin(req, res) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  await db.query('delete from checkins where id = $1', [id]);
  return json(res, 200, { ok: true });
}

async function deleteRun(req, res) {
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  await db.query('delete from runs where id = $1', [id]);
  return json(res, 200, { ok: true });
}

// ---- Push --------------------------------------------------------------

async function sendPushTo(subs, payload) {
  let sent = 0; const errs = [];
  for (const r of subs) {
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload);
      sent++;
    } catch (err) {
      const code = err.statusCode;
      if (code === 404 || code === 410) {
        await db.query('delete from push_subscriptions where endpoint = $1', [r.endpoint]);
        errs.push(`${code} expired (removed)`);
      } else {
        errs.push(`${code || 'error'}: ${String(err.body || err.message || err).slice(0, 200)}`);
      }
    }
  }
  return { sent, errs };
}

function buildPayload(body) {
  const title = String(body.title || 'Pulseform').slice(0, 80);
  const text = String(body.body || '').slice(0, 240);
  if (!text) return null;
  const url = (typeof body.url === 'string' && body.url.startsWith('/')) ? body.url : '/';
  return JSON.stringify({ title, body: text, url });
}

async function pushUser(req, res) {
  if (!ensure()) return json(res, 503, { error: 'Push is not configured on the server.' });
  const id = qid(req);
  if (!id) return json(res, 400, { error: 'Missing id.' });
  const body = await readBody(req);
  const payload = buildPayload(body);
  if (!payload) return json(res, 400, { error: 'Body text is required.' });
  const { rows } = await db.query(
    'select endpoint, p256dh, auth from push_subscriptions where user_id = $1', [id]);
  if (!rows.length) return json(res, 400, { error: 'This user has no push subscriptions.' });
  const { sent, errs } = await sendPushTo(rows, payload);
  return json(res, 200, { ok: true, sent, errors: errs });
}

async function pushAll(req, res) {
  if (!ensure()) return json(res, 503, { error: 'Push is not configured on the server.' });
  const body = await readBody(req);
  const payload = buildPayload(body);
  if (!payload) return json(res, 400, { error: 'Body text is required.' });
  const { rows } = await db.query('select endpoint, p256dh, auth from push_subscriptions');
  if (!rows.length) return json(res, 400, { error: 'No subscriptions to send to.' });
  const { sent, errs } = await sendPushTo(rows, payload);
  return json(res, 200, { ok: true, candidates: rows.length, sent, errors: errs });
}

// ---- Dispatch ----------------------------------------------------------

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return; // response already sent
  const action = resolveAction(req);
  try {
    if (action === 'stats')          { if (req.method !== 'GET')    return json(res, 405, { error: 'Method not allowed' }); return await stats(req, res); }
    if (action === 'users')          { if (req.method !== 'GET')    return json(res, 405, { error: 'Method not allowed' }); return await usersList(req, res); }
    if (action === 'user')           { if (req.method !== 'GET')    return json(res, 405, { error: 'Method not allowed' }); return await userDetail(req, res); }
    if (action === 'suspend')        { if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' }); return await suspend(req, res, admin); }
    if (action === 'unsuspend')      { if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' }); return await unsuspend(req, res); }
    if (action === 'delete-user')    { if (req.method !== 'DELETE') return json(res, 405, { error: 'Method not allowed' }); return await deleteUser(req, res, admin); }
    if (action === 'reset-password') { if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' }); return await resetPassword(req, res); }
    if (action === 'set-role')       { if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' }); return await setRole(req, res, admin); }
    if (action === 'delete-video')   { if (req.method !== 'DELETE') return json(res, 405, { error: 'Method not allowed' }); return await deleteVideo(req, res); }
    if (action === 'delete-checkin') { if (req.method !== 'DELETE') return json(res, 405, { error: 'Method not allowed' }); return await deleteCheckin(req, res); }
    if (action === 'delete-run')     { if (req.method !== 'DELETE') return json(res, 405, { error: 'Method not allowed' }); return await deleteRun(req, res); }
    if (action === 'push-user')      { if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' }); return await pushUser(req, res); }
    if (action === 'push-all')       { if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' }); return await pushAll(req, res); }
    return json(res, 400, { error: 'Unknown admin action.' });
  } catch (err) {
    return json(res, 500, { error: 'Admin request failed.', detail: String(err.message || err) });
  }
};
