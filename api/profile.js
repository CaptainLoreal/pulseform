const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json, readBody } = require('../lib/http');

// GET → current profile.  PUT → upsert onboarding data (marks onboarded).
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });

  try {
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
