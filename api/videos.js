const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json, readBody } = require('../lib/http');
const { ensureVideos } = require('../lib/videos');

// GET → list. POST → save metadata (file itself lives on device in IndexedDB). DELETE → remove.
module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  try {
    await ensureVideos();

    if (req.method === 'GET') {
      const { rows } = await db.query(
        `select id, local_id, kind, recorded_at, duration_s, width, height, thumb, notes
         from videos where user_id = $1 order by recorded_at desc limit 50`, [sess.uid]);
      return json(res, 200, { videos: rows });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      if (!b.local_id) return json(res, 400, { error: 'Missing local_id.' });
      // Cap thumbnail size as a safety net (the client already shrinks it).
      const thumb = typeof b.thumb === 'string' && b.thumb.length < 60000 ? b.thumb : null;
      const { rows } = await db.query(
        `insert into videos (user_id, local_id, kind, duration_s, width, height, thumb, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id, local_id, kind, recorded_at, duration_s, width, height, thumb, notes`,
        [sess.uid, b.local_id, b.kind || 'side', b.duration_s || null,
         b.width || null, b.height || null, thumb, b.notes || null]);
      return json(res, 200, { video: rows[0] });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (await readBody(req)).id;
      if (!id) return json(res, 400, { error: 'Missing id.' });
      await db.query('delete from videos where id = $1 and user_id = $2', [id, sess.uid]);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 500, { error: 'Could not handle videos.', detail: String(e.message || e) });
  }
};
