const db = require('../lib/db');
const schema = require('../lib/schema');
const { json } = require('../lib/http');

// One-shot, idempotent schema apply. Guarded by ?token=<SESSION_SECRET or MIGRATE_SECRET>.
// Run once after the database is connected: GET /api/migrate?token=...
module.exports = async (req, res) => {
  const token = (req.query && req.query.token) || '';
  const expected = process.env.MIGRATE_SECRET || process.env.SESSION_SECRET;
  if (!expected || token !== expected) return json(res, 403, { error: 'Forbidden' });
  try {
    await db.query(schema);
    const { rows } = await db.query(
      `select table_name from information_schema.tables
       where table_schema = 'public' order by table_name`);
    return json(res, 200, { ok: true, tables: rows.map((r) => r.table_name) });
  } catch (err) {
    return json(res, 500, { error: 'Migration failed.', detail: String(err.message || err) });
  }
};
