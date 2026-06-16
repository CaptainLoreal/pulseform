const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json } = require('../lib/http');
const { ensureRuns } = require('../lib/runs');

// List the current user's imported runs (most recent first).
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  try {
    await ensureRuns();
    const { rows } = await db.query(
      `select id, source, started_at, distance_m, duration_s, avg_hr, max_hr, avg_cadence, avg_gct, avg_vo
       from runs where user_id = $1 order by coalesce(started_at, created_at) desc limit 20`, [sess.uid]);
    return json(res, 200, { runs: rows });
  } catch (e) {
    return json(res, 500, { error: 'Could not load runs.', detail: String(e.message || e) });
  }
};
