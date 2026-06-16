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

## Structure

```
pulseform-app/
├── index.html        # shell: loads DS tokens + React + the app
├── src/
│   ├── app.jsx        # all screens, navigation, demo data model
│   └── app.css        # screen-level layout (device frame, tab bar, screens)
├── ds/                # Pulseform Design System (tokens + component bundle)
│   ├── styles.css     # @imports the token files
│   ├── tokens/*.css   # colors, typography, spacing, effects, fonts
│   └── _ds_bundle.js  # Button, Badge, ScoreRing, MetricCard, SignalBar, …
└── assets/            # logos + photography
```

It reuses the **actual** design-system primitives (`ScoreRing`, `MetricCard`,
`SignalBar`, `Button`, `Badge`, `Avatar`, `Card`, `Input`, `Switch`) so colors,
type and components match the handoff exactly. New app screens are composed on top.

## Notes / next steps

- This is a **no-build prototype** (React + Babel from CDN, the same approach as the
  design handoff deck) so it runs by just opening it. For production, port to Vite +
  React and precompile (drop the in-browser Babel), and wire real sensor/data APIs in
  place of the static demo model in `app.jsx`.
- Data is illustrative but internally consistent — the check-in really does recompute
  the RunReady score.
