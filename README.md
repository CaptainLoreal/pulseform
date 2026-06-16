# Pulseform — mobile app (prototype)

**Train with your body, not against it.** A runnable, mobile-first prototype of the
Pulseform running app, built on the Pulseform Design System from the pitch design
handoff. It walks one complete **user story** end to end.

## The user story it covers

| # | Screen | Maps to |
|---|--------|---------|
| 1 | **Welcome** | the welcome menu / hero |
| 2 | **Login** + **Onboarding** (6 steps) | "Login" und Datenabfragen — name, body basics, running level, goal, injury history, sensor pairing |
| 3 | **Today** — RunReady + Cardiovascular | Fitness Scores (Cardiovascular Score, daily: HRV, resting HR, training load, decoupling …) |
| 4 | **Form** — Biomechanical Score | Biomechanical Score (weekly: cadence, ground contact, **knee valgus index**, **pelvic drop** …) with a gait schematic |
| 5 | **Plan** — adaptive session | Trainingstipps — the recommendation dynamically adapted to readiness + biomechanics |

Plus a **daily morning check-in** (a data query) that recomputes the RunReady score
live, and a **You** tab that reflects everything captured in onboarding.

## How it's grounded in the concept (from `LMU-TeamUpdate.pptx`)

- **One RunReady Score = two signal families.** Cardiovascular (daily) + Biomechanical
  (weekly) merge into the daily readiness number — exactly the module structure in the
  team update (slide 7).
- **Biomechanical is the limiter.** Knee valgus (14°) and pelvic drop (9°) are flagged,
  which is *why* tomorrow's tempo run is swapped for an easy run + knee-stability circuit
  ("dynamische Anpassung").
- **Scores are unit-free 0–100**, with sub-parameters shown in real units (ms, bpm, spm, °).
- Demo persona is **Nathalie** (returning from a knee injury) — one of the two founder
  personas in the pitch.

## Run it

```bash
cd pulseform-app
python3 -m http.server 4178
# open http://localhost:4178
```

Mobile-first: full-screen on a phone, shown inside a phone bezel on desktop.

## Architecture

Static frontend + serverless API on Vercel, backed by **Vercel Postgres**.
Postgres is never exposed to the browser — the static app calls `/api/*` functions.

```
pulseform-app/
├── index.html        # shell: loads DS tokens + React + the app
├── src/
│   ├── app.jsx        # all screens, navigation, API client
│   └── app.css        # screen-level layout (device frame, tab bar, screens)
├── ds/                # Pulseform Design System (tokens + component bundle)
├── assets/            # logos + photography
├── api/               # Vercel serverless functions
│   ├── auth/{signup,login,logout}.js
│   ├── me.js          # current session + profile
│   ├── profile.js     # GET / PUT onboarding data
│   ├── checkins.js    # GET / POST daily readiness check-in
│   └── migrate.js     # one-shot schema apply (token-guarded)
├── lib/               # db pool, auth (jwt+bcrypt), http helpers, schema
├── package.json       # function deps: pg, bcryptjs, jsonwebtoken
└── vercel.json        # static + functions config
```

### Data model (Postgres)
- **users** — email + bcrypt password hash
- **profiles** — the onboarding data (name, body baselines, goal, injuries …)
- **checkins** — one per user per day (sleep, soreness, pain → symptoms + run-ready)

Auth is a signed JWT in an httpOnly cookie. The score metrics (cardio/biomech
parameters) stay client-side demo data — they'd come from the sensor in production;
the DB persists the account, profile and daily check-ins.

## Deploy (Vercel)

Required environment variables on the Vercel project:

| Var | Purpose |
|---|---|
| `POSTGRES_URL` (or `DATABASE_URL`) | Postgres connection string — auto-set when you attach Vercel Postgres |
| `SESSION_SECRET` | random string used to sign session cookies |
| `MIGRATE_SECRET` | (optional) token to authorise `/api/migrate` |

After the DB is attached and env vars are set, apply the schema once:

```
GET https://<deployment>/api/migrate?token=<MIGRATE_SECRET or SESSION_SECRET>
```

## Notes / next steps

- The **frontend** is still a no-build bundle (React + Babel from CDN). For
  production, precompile the JSX (drop in-browser Babel) — the API layer is already
  production-shaped.
- Score metrics are illustrative; the **check-in really persists** and recomputes the
  RunReady score per user per day.
