// Videos table + lazy ensure. Stores metadata + a small base64 thumbnail.
// The video file itself stays on the device (IndexedDB) — Postgres just tracks it.
const db = require('./db');

const VIDEOS_SQL = `
create table if not exists videos (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  local_id    text,
  url         text,
  path        text,
  kind        text,
  recorded_at timestamptz not null default now(),
  duration_s  numeric,
  width       int,
  height      int,
  thumb       text,
  notes       text,
  created_at  timestamptz not null default now()
);
alter table videos add column if not exists url text;
alter table videos add column if not exists path text;
alter table videos alter column local_id drop not null;
create index if not exists videos_user_idx on videos (user_id, recorded_at desc);`;

let ensured = false;
async function ensureVideos() {
  if (ensured) return;
  await db.query(VIDEOS_SQL);
  ensured = true;
}

module.exports = { ensureVideos, VIDEOS_SQL };
