// Database schema. Applied idempotently by /api/migrate.
module.exports = `
create extension if not exists pgcrypto;

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists profiles (
  user_id    uuid primary key references users(id) on delete cascade,
  name       text,
  sex        text,
  age        int,
  height     int,
  weight     int,
  rest_hr    int,
  experience text,
  weekly     int,
  goal       text,
  injuries   text[],
  pain       int,
  onboarded  boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists checkins (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  day        date not null default current_date,
  sleep      int,
  soreness   int,
  pain       text,
  symptoms   int,
  run_ready  int,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists push_subscriptions (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

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
);

create table if not exists videos (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  local_id    text not null,
  kind        text,
  recorded_at timestamptz not null default now(),
  duration_s  numeric,
  width       int,
  height      int,
  thumb       text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists videos_user_idx on videos (user_id, recorded_at desc);
`;
