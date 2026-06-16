const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json, readBody } = require('../lib/http');

// GET → today's check-in (or null).  POST → upsert today's check-in.
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });

  try {
    if (req.method === 'GET') {
      const { rows } = await db.query(
        `select sleep, soreness, pain, symptoms, run_ready
         from checkins where user_id = $1 and day = current_date`, [sess.uid]);
      return json(res, 200, { checkin: rows[0] || null });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      const { rows } = await db.query(
        `insert into checkins (user_id, day, sleep, soreness, pain, symptoms, run_ready)
         values ($1, current_date, $2, $3, $4, $5, $6)
         on conflict (user_id, day) do update set
           sleep=$2, soreness=$3, pain=$4, symptoms=$5, run_ready=$6, created_at=now()
         returning sleep, soreness, pain, symptoms, run_ready`,
        [sess.uid, b.sleep, b.soreness, b.pain, b.symptoms, b.runReady]);
      return json(res, 200, { checkin: rows[0] });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    return json(res, 500, { error: 'Could not save check-in.', detail: String(err.message || err) });
  }
};
