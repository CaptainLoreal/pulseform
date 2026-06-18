const db = require('../lib/db');
const { getUser, clearSessionCookie } = require('../lib/auth');
const { json, readBody } = require('../lib/http');

// GET → current profile.  PUT → upsert onboarding data.
// DELETE ?action=delete-account → cascade-delete the user and clear session.
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  const action = (req.query && req.query.action) || '';

  try {
    if (req.method === 'DELETE' && action === 'delete-account') {
      // Best-effort: remove any video blobs before the row cascades away.
      try {
        const { rows } = await db.query('select url from videos where user_id = $1 and url is not null', [sess.uid]);
        if (rows.length) {
          const { del } = require('@vercel/blob');
          await Promise.all(rows.map(r => del(r.url).catch(() => {})));
        }
      } catch (e) { /* table may not exist yet — ignore */ }
      await db.query('delete from users where id = $1', [sess.uid]);
      clearSessionCookie(res);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET') {
      const { rows } = await db.query(
        `select name, sex, age, height, weight, rest_hr, experience, weekly, goal, injuries, pain, onboarded
         from profiles where user_id = $1`, [sess.uid]);
      return json(res, 200, { profile: rows[0] || null });
    }

    if (req.method === 'PUT') {
      const b = await readBody(req);
      const injuries = Array.isArray(b.injuries) ? b.injuries : [];
      await db.query(
        `insert into profiles
           (user_id, name, sex, age, height, weight, rest_hr, experience, weekly, goal, injuries, pain, onboarded, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,now())
         on conflict (user_id) do update set
           name=$2, sex=$3, age=$4, height=$5, weight=$6, rest_hr=$7, experience=$8,
           weekly=$9, goal=$10, injuries=$11, pain=$12, onboarded=true, updated_at=now()`,
        [sess.uid, b.name, b.sex, b.age, b.height, b.weight, b.restHr,
         b.experience, b.weekly, b.goal, injuries, b.pain]);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    return json(res, 500, { error: 'Could not save profile.', detail: String(err.message || err) });
  }
};
