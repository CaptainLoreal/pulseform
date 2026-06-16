// Runs table + lazy ensure (so import works without a separate migration step).
const db = require('./db');

const RUNS_SQL = `
create table if not exists runs (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  source      text,
  started_at  timestamptz,
  distance_m  numeric,
  duration_s  numeric,
  avg_hr      int,
  max_hr      int,
  avg_cadence int,
  avg_gct     int,
  avg_vo      numeric,
  filename    text,
  created_at  timestamptz not null default now()
);`;

let ensured = false;
async function ensureRuns() {
  if (ensured) return;
  await db.query(RUNS_SQL);
  ensured = true;
}

module.exports = { ensureRuns, RUNS_SQL };
