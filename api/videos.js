// Video API:
//   GET                  -> list current user's videos
//   POST                 -> save metadata (after a successful direct upload)
//   POST  ?action=upload -> signing endpoint for browser-direct upload to Vercel Blob
//   DELETE ?id=<n>       -> remove DB row + delete the blob
const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json, readBody } = require('../lib/http');
const { ensureVideos } = require('../lib/videos');

function resolveAction(req) {
  const q = (req.query && req.query.action) || '';
  if (q) return String(q);
  const m = String(req.url || '').match(/\/api\/videos\/([a-z-]+)/i);
  return m ? m[1] : '';
}

// Browser-direct upload: the client POSTs a request to this endpoint with
// `{type:'blob.generate-client-token', payload:{pathname,callbackUrl,...}}`.
// We validate the session, hand back a signed client token, then the
// browser uploads the file directly to Vercel Blob's CDN — bypassing the
// 4.5 MB serverless body cap.
async function uploadHandler(req, res, sess) {
  let handleUpload;
  try { ({ handleUpload } = require('@vercel/blob/client')); }
  catch (e) { return json(res, 503, { error: 'Blob upload not available on the server.' }); }

  const body = await readBody(req);
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/*'],
        maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB hard cap
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ uid: sess.uid }),
      }),
      // We persist client-side after upload(), so the webhook is a no-op.
      onUploadCompleted: async () => {},
    });
    return json(res, 200, result);
  } catch (e) {
    return json(res, 400, { error: 'Could not sign upload.', detail: String(e.message || e) });
  }
}

module.exports = async (req, res) => {
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  await ensureVideos();
  const action = resolveAction(req);

  try {
    if (action === 'upload') return uploadHandler(req, res, sess);

    if (req.method === 'GET') {
      const { rows } = await db.query(
        `select id, local_id, url, path, kind, recorded_at, duration_s, width, height, thumb, notes
         from videos where user_id = $1 order by recorded_at desc limit 50`, [sess.uid]);
      return json(res, 200, { videos: rows });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      if (!b.url && !b.local_id) return json(res, 400, { error: 'Missing url or local_id.' });
      const thumb = typeof b.thumb === 'string' && b.thumb.length < 60000 ? b.thumb : null;
      const { rows } = await db.query(
        `insert into videos (user_id, local_id, url, path, kind, duration_s, width, height, thumb, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id, local_id, url, path, kind, recorded_at, duration_s, width, height, thumb, notes`,
        [sess.uid, b.local_id || null, b.url || null, b.path || null,
         b.kind || 'side', b.duration_s || null,
         b.width || null, b.height || null, thumb, b.notes || null]);
      return json(res, 200, { video: rows[0] });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (await readBody(req)).id;
      if (!id) return json(res, 400, { error: 'Missing id.' });
      // Look up the row first so we can delete the blob too.
      const { rows } = await db.query('select url from videos where id = $1 and user_id = $2', [id, sess.uid]);
      const row = rows[0];
      await db.query('delete from videos where id = $1 and user_id = $2', [id, sess.uid]);
      if (row && row.url) {
        try { const { del } = require('@vercel/blob'); await del(row.url); }
        catch (e) { /* leave the blob; row is already gone */ }
      }
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 500, { error: 'Could not handle videos.', detail: String(e.message || e) });
  }
};
