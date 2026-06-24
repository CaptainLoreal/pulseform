const db = require('../lib/db');
const { getUser } = require('../lib/auth');
const { json, readBody } = require('../lib/http');
const { ensureRuns } = require('../lib/runs');

const num = (x) => { const n = parseFloat(x); return Number.isNaN(n) ? null : n; };
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// Daily wellness metrics, uploaded as a pre-aggregated JSON summary.
// The browser parses huge Apple Health / Garmin / generic CSV exports
// client-side (one file can be hundreds of MB), then POSTs us a small
// per-day rollup — keeps us well under the Vercel 4.5 MB body cap and
// 10 s function timeout.
async function importDailyMetrics(req, res, sess) {
  const body = await readBody(req);
  const source = String(body.source || 'unknown').slice(0, 40);
  const metrics = Array.isArray(body.metrics) ? body.metrics : [];
  if (!metrics.length) return json(res, 400, { error: 'No daily metrics in payload.' });
  if (metrics.length > 1500) return json(res, 400, { error: 'Too many days at once (max 1500 ≈ 4 yrs).' });

  let written = 0;
  for (const m of metrics) {
    if (!isDay(m.day)) continue;
    const sleep = m.sleep_minutes != null ? Math.round(+m.sleep_minutes) : null;
    const hrv   = m.hrv_rmssd     != null ? round1(+m.hrv_rmssd)         : null;
    const rhr   = m.resting_hr    != null ? Math.round(+m.resting_hr)    : null;
    const steps = m.steps         != null ? Math.round(+m.steps)         : null;
    const wt    = m.weight_kg     != null ? round1(+m.weight_kg)         : null;
    if (sleep == null && hrv == null && rhr == null && steps == null && wt == null) continue;
    await db.query(
      `insert into daily_metrics (user_id, day, sleep_minutes, hrv_rmssd, resting_hr, steps, weight_kg, source)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (user_id, day) do update set
         sleep_minutes = coalesce(excluded.sleep_minutes, daily_metrics.sleep_minutes),
         hrv_rmssd     = coalesce(excluded.hrv_rmssd,     daily_metrics.hrv_rmssd),
         resting_hr    = coalesce(excluded.resting_hr,    daily_metrics.resting_hr),
         steps         = coalesce(excluded.steps,         daily_metrics.steps),
         weight_kg     = coalesce(excluded.weight_kg,     daily_metrics.weight_kg),
         source        = excluded.source,
         updated_at    = now()`,
      [sess.uid, m.day, sleep, hrv, rhr, steps, wt, source]);
    written++;
  }
  return json(res, 200, { ok: true, days: written, source });
}

async function readRaw(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body && req.body.type === 'Buffer' && Array.isArray(req.body.data)) return Buffer.from(req.body.data);
  if (typeof req.body === 'string') return Buffer.from(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

function parseTcx(doc) {
  const a = doc && doc.TrainingCenterDatabase && doc.TrainingCenterDatabase.Activities && doc.TrainingCenterDatabase.Activities.Activity;
  const activity = Array.isArray(a) ? a[0] : a;
  if (!activity) throw new Error('No activity found in TCX.');
  const laps = arr(activity.Lap);
  let dist = 0, time = 0, hrSum = 0, hrW = 0, maxHr = 0, cadSum = 0, cadN = 0;
  for (const lap of laps) {
    const t = num(lap.TotalTimeSeconds) || 0;
    const d = num(lap.DistanceMeters) || 0;
    time += t; dist += d;
    const avg = num(lap.AverageHeartRateBpm && lap.AverageHeartRateBpm.Value);
    if (avg) { hrSum += avg * (t || 1); hrW += (t || 1); }
    const mx = num(lap.MaximumHeartRateBpm && lap.MaximumHeartRateBpm.Value);
    if (mx && mx > maxHr) maxHr = mx;
    // Garmin running cadence lives in lap extensions (steps/min already)
    const ext = lap.Extensions || {};
    const lx = ext['ns3:LX'] || ext.LX || {};
    const rc = num(lx['ns3:AvgRunCadence'] || lx.AvgRunCadence);
    if (rc) { cadSum += rc * 2 * (t || 1); cadN += (t || 1); } // RunCadence is per-leg; ×2 = spm
  }
  return {
    started_at: activity.Id || (laps[0] && laps[0]['@_StartTime']) || null,
    distance_m: dist || null,
    duration_s: time || null,
    avg_hr: hrW ? Math.round(hrSum / hrW) : null,
    max_hr: maxHr || null,
    avg_cadence: cadN ? Math.round(cadSum / cadN) : null,
    avg_gct: null, avg_vo: null,
  };
}

function haversine(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function parseGpx(doc) {
  const trk = doc && doc.gpx && doc.gpx.trk;
  const segs = arr(trk).flatMap((t) => arr(t.trkseg));
  const pts = segs.flatMap((s) => arr(s.trkpt));
  if (!pts.length) throw new Error('No track points found in GPX.');
  let dist = 0, prev = null, hrSum = 0, hrN = 0;
  for (const p of pts) {
    const lat = num(p['@_lat']), lon = num(p['@_lon']);
    if (lat != null && lon != null) { if (prev) dist += haversine(prev, { lat, lon }); prev = { lat, lon }; }
    const ext = p.extensions || {};
    const tpx = ext['gpxtpx:TrackPointExtension'] || ext.TrackPointExtension || {};
    const hr = num(tpx['gpxtpx:hr'] || tpx.hr);
    if (hr) { hrSum += hr; hrN++; }
  }
  const t0 = pts[0].time, t1 = pts[pts.length - 1].time;
  let dur = null;
  if (t0 && t1) { const d = (new Date(t1).getTime() - new Date(t0).getTime()) / 1000; if (d > 0) dur = d; }
  return {
    started_at: t0 || null, distance_m: Math.round(dist) || null, duration_s: dur,
    avg_hr: hrN ? Math.round(hrSum / hrN) : null, max_hr: null, avg_cadence: null, avg_gct: null, avg_vo: null,
  };
}

function parseFit(buf) {
  let FitParser;
  try { FitParser = require('fit-file-parser').default; }
  catch (e) { throw new Error('FIT parsing is unavailable — export as TCX instead.'); }
  const fp = new FitParser({ force: true, mode: 'list', lengthUnit: 'm', speedUnit: 'km/h', elapsedRecordField: true });
  return new Promise((resolve, reject) => {
    fp.parse(buf, (err, data) => {
      if (err) return reject(new Error('Could not read that FIT file.'));
      const s = (data.sessions && data.sessions[0]) || {};
      resolve({
        started_at: s.start_time || (data.activity && data.activity.timestamp) || null,
        distance_m: s.total_distance != null ? s.total_distance : null,
        duration_s: s.total_timer_time != null ? s.total_timer_time : (s.total_elapsed_time || null),
        avg_hr: s.avg_heart_rate || null, max_hr: s.max_heart_rate || null,
        avg_cadence: s.avg_running_cadence != null ? Math.round(s.avg_running_cadence * 2)
          : (s.avg_cadence != null ? Math.round(s.avg_cadence * 2) : null),
        avg_gct: s.avg_stance_time != null ? Math.round(s.avg_stance_time) : null,
        avg_vo: s.avg_vertical_oscillation != null ? round1(s.avg_vertical_oscillation / 10) : null,
      });
    });
  });
}

// Open Wearables (openwearables.io) JSON import.
// Accepts the project's canonical schemas verbatim — paste a raw API
// response or a hand-assembled bundle, both work. We mirror the OW
// field names exactly so users don't need to translate anything.
//
// Supported shapes:
//   1. Bundle:   { workouts: [...], sleep_sessions: [...], activity_summaries: [...],
//                  recovery_summaries: [...], body_summary: {...} }
//   2. Paginated response: { data: [...], pagination, metadata }
//      → record type inferred from the first item.
//   3. Bare array of records: [...] → record type inferred from the first item.
//
// OW → Pulseform mapping:
//   Workout (running / >1km) → runs row
//   SleepSession             → daily_metrics.sleep_minutes (bucketed by start_time)
//   ActivitySummary          → daily_metrics.steps
//   RecoverySummary          → daily_metrics.sleep_minutes / hrv_rmssd / resting_hr
//                              (we store SDNN ms in the hrv_rmssd column — same
//                              compromise as Apple Health; flagged in Formulas tab)
//   BodySummary              → daily_metrics.weight_kg (today's row, latest reading)
const RUN_TYPES = new Set([
  'running', 'run', 'trail_running', 'treadmill_running', 'jogging', 'walking', 'hiking',
]);

function classify(rec) {
  if (!rec || typeof rec !== 'object') return null;
  if (rec.type && rec.start_time && rec.end_time)                                return 'workouts';
  if (rec.start_time && rec.end_time && 'sleep_duration_seconds' in rec)         return 'sleep_sessions';
  if (rec.start_time && rec.end_time && 'efficiency_percent' in rec)             return 'sleep_sessions';
  if (rec.date && ('avg_hrv_sdnn_ms' in rec || 'recovery_score' in rec
                || 'resting_heart_rate_bpm' in rec))                             return 'recovery_summaries';
  if (rec.date && ('steps' in rec || 'active_minutes' in rec
                || 'intensity_minutes' in rec))                                  return 'activity_summaries';
  if (rec.slow_changing || rec.averaged || rec.latest)                           return 'body_summary';
  return null;
}

function bundleFromArray(items) {
  const out = {};
  for (const it of items) {
    const kind = classify(it);
    if (!kind) continue;
    if (kind === 'body_summary') { out.body_summary = it; continue; }
    (out[kind] = out[kind] || []).push(it);
  }
  return out;
}

const dayOfTs = (ts) => ts ? String(ts).slice(0, 10) : null;

async function upsertDaily(uid, day, patch, source) {
  if (!isDay(day)) return false;
  const keys = Object.keys(patch).filter(k => patch[k] != null);
  if (!keys.length) return false;
  await db.query(
    `insert into daily_metrics (user_id, day, sleep_minutes, hrv_rmssd, resting_hr, steps, weight_kg, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (user_id, day) do update set
       sleep_minutes = coalesce(excluded.sleep_minutes, daily_metrics.sleep_minutes),
       hrv_rmssd     = coalesce(excluded.hrv_rmssd,     daily_metrics.hrv_rmssd),
       resting_hr    = coalesce(excluded.resting_hr,    daily_metrics.resting_hr),
       steps         = coalesce(excluded.steps,         daily_metrics.steps),
       weight_kg     = coalesce(excluded.weight_kg,     daily_metrics.weight_kg),
       source        = excluded.source,
       updated_at    = now()`,
    [uid, day,
     patch.sleep_minutes != null ? Math.round(patch.sleep_minutes) : null,
     patch.hrv_rmssd     != null ? round1(patch.hrv_rmssd)         : null,
     patch.resting_hr    != null ? Math.round(patch.resting_hr)    : null,
     patch.steps         != null ? Math.round(patch.steps)         : null,
     patch.weight_kg     != null ? round1(patch.weight_kg)         : null,
     source]);
  return true;
}

async function ingestWorkouts(uid, items, srcLabel) {
  await ensureRuns();
  let n = 0;
  for (const w of items) {
    if (!w || !w.start_time) continue;
    const t = String(w.type || '').toLowerCase().replace(/\s+/g, '_');
    const dist = w.distance_meters != null ? +w.distance_meters : null;
    if (!RUN_TYPES.has(t) && !(dist && dist > 1000)) continue;  // skip non-cardio
    const provider = (w.source && w.source.provider) || 'open-wearables';
    await db.query(
      `insert into runs (user_id, source, started_at, distance_m, duration_s,
                         avg_hr, max_hr, avg_cadence, avg_gct, avg_vo, filename)
       values ($1,$2,$3,$4,$5,$6,$7,null,null,null,$8)`,
      [uid, `ow:${provider}`, w.start_time, dist,
       w.duration_seconds != null ? +w.duration_seconds : null,
       w.avg_heart_rate_bpm != null ? +w.avg_heart_rate_bpm : null,
       w.max_heart_rate_bpm != null ? +w.max_heart_rate_bpm : null,
       w.id || w.name || 'open-wearables.json']);
    n++;
  }
  return n;
}

async function ingestSleepSessions(uid, items, srcLabel) {
  const perDay = new Map();
  for (const s of items) {
    if (s.is_nap) continue;
    const day = dayOfTs(s.start_time);
    if (!day) continue;
    const mins = s.sleep_duration_seconds != null ? +s.sleep_duration_seconds / 60
              : s.duration_seconds       != null ? +s.duration_seconds       / 60 : 0;
    perDay.set(day, (perDay.get(day) || 0) + mins);
  }
  let n = 0;
  for (const [day, m] of perDay) if (await upsertDaily(uid, day, { sleep_minutes: m }, srcLabel)) n++;
  return n;
}

async function ingestActivitySummaries(uid, items, srcLabel) {
  let n = 0;
  for (const a of items) {
    const ok = await upsertDaily(uid, a.date, { steps: a.steps }, srcLabel);
    if (ok) n++;
  }
  return n;
}

async function ingestRecoverySummaries(uid, items, srcLabel) {
  let n = 0;
  for (const r of items) {
    const ok = await upsertDaily(uid, r.date, {
      sleep_minutes: r.sleep_duration_seconds != null ? +r.sleep_duration_seconds / 60 : null,
      hrv_rmssd:     r.avg_hrv_sdnn_ms        != null ? +r.avg_hrv_sdnn_ms              : null,
      resting_hr:    r.resting_heart_rate_bpm != null ? +r.resting_heart_rate_bpm       : null,
    }, srcLabel);
    if (ok) n++;
  }
  return n;
}

async function ingestBodySummary(uid, body, srcLabel) {
  const wt = body && body.slow_changing && body.slow_changing.weight_kg;
  if (wt == null) return 0;
  const today = new Date().toISOString().slice(0, 10);
  return await upsertDaily(uid, today, { weight_kg: +wt }, srcLabel) ? 1 : 0;
}

async function importOpenWearables(req, res, sess) {
  const body = await readBody(req);
  if (!body || typeof body !== 'object') return json(res, 400, { error: 'Expected a JSON object or array.' });

  let bundle;
  if (Array.isArray(body))                              bundle = bundleFromArray(body);
  else if (Array.isArray(body.data))                    bundle = bundleFromArray(body.data);
  else if (body.workouts || body.sleep_sessions || body.activity_summaries
        || body.recovery_summaries || body.body_summary) bundle = body;
  else                                                   bundle = bundleFromArray([body]);

  const srcLabel = 'open-wearables';
  const out = { ok: true, workouts: 0, sleep_sessions: 0, activity_summaries: 0, recovery_summaries: 0, body_summary: 0 };
  try {
    if (Array.isArray(bundle.workouts))            out.workouts            = await ingestWorkouts(sess.uid, bundle.workouts, srcLabel);
    if (Array.isArray(bundle.sleep_sessions))      out.sleep_sessions      = await ingestSleepSessions(sess.uid, bundle.sleep_sessions, srcLabel);
    if (Array.isArray(bundle.activity_summaries))  out.activity_summaries  = await ingestActivitySummaries(sess.uid, bundle.activity_summaries, srcLabel);
    if (Array.isArray(bundle.recovery_summaries))  out.recovery_summaries  = await ingestRecoverySummaries(sess.uid, bundle.recovery_summaries, srcLabel);
    if (bundle.body_summary)                       out.body_summary        = await ingestBodySummary(sess.uid, bundle.body_summary, srcLabel);
  } catch (e) {
    return json(res, 500, { error: 'Open Wearables import failed.', detail: String(e.message || e), partial: out });
  }
  const touched = out.workouts + out.sleep_sessions + out.activity_summaries + out.recovery_summaries + out.body_summary;
  if (!touched) return json(res, 400, { error: 'No recognised Open Wearables records found.' });
  return json(res, 200, out);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const sess = getUser(req);
  if (!sess) return json(res, 401, { error: 'Not signed in.' });
  const action = (req.query && req.query.action) || '';
  if (action === 'daily-metrics')   return importDailyMetrics(req, res, sess);
  if (action === 'open-wearables')  return importOpenWearables(req, res, sess);
  try {
    const name = ((req.query && req.query.name) || 'run').toLowerCase();
    const buf = await readRaw(req);
    if (!buf || !buf.length) return json(res, 400, { error: 'Empty file.' });

    const isFit = name.endsWith('.fit') || (buf.length > 12 && buf.slice(8, 12).toString('latin1') === '.FIT');
    let source, summary;
    if (isFit) {
      source = 'fit'; summary = await parseFit(buf);
    } else {
      const xml = buf.toString('utf8').replace(/^﻿/, '');
      const { XMLParser } = require('fast-xml-parser');
      const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml);
      if (doc.gpx) { source = 'gpx'; summary = parseGpx(doc); }
      else if (doc.TrainingCenterDatabase) { source = 'tcx'; summary = parseTcx(doc); }
      else return json(res, 400, { error: 'Unrecognised file — export a .tcx, .gpx or .fit from Garmin Connect.' });
    }

    await ensureRuns();
    const { rows } = await db.query(
      `insert into runs (user_id, source, started_at, distance_m, duration_s, avg_hr, max_hr, avg_cadence, avg_gct, avg_vo, filename)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       returning id, source, started_at, distance_m, duration_s, avg_hr, max_hr, avg_cadence, avg_gct, avg_vo`,
      [sess.uid, source, summary.started_at, summary.distance_m, summary.duration_s, summary.avg_hr,
       summary.max_hr, summary.avg_cadence, summary.avg_gct, summary.avg_vo, name]);
    return json(res, 200, { run: rows[0] });
  } catch (e) {
    return json(res, 400, { error: e.message || 'Could not import that file.' });
  }
};
