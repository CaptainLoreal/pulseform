/* ============================================================
   Pulseform — mobile app
   Covers the full user story:
   Welcome → Login → Data queries (onboarding) →
   Fitness / Cardiovascular Score → Biomechanical Score → Training tips
   Built on the Pulseform Design System primitives.
   ============================================================ */

const { useState, useEffect, useMemo } = React;
const PF = window.PulseformDesignSystem_ec19d3 || {};
const { Button, Badge, Avatar, Card, Input, Switch, ScoreRing, MetricCard, SignalBar } = PF;

const cx = (...a) => a.filter(Boolean).join(' ');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---- API client (talks to the Vercel serverless functions) ---- */
async function api(path, opts = {}) {
  try {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON (e.g. 404 page) */ }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: 'Network error — could not reach the server.' } };
  }
}
const DEFAULT_PROFILE = {
  name: '', sex: 'Female', age: 31, height: 168, weight: 61, restHr: 52,
  experience: 'Returning', weekly: 28, goal: 'return', injuries: ['Knee'], pain: 2,
};
const fromApiProfile = (p) => ({
  name: p.name || '', sex: p.sex || 'Female', age: p.age ?? 31, height: p.height ?? 168,
  weight: p.weight ?? 61, restHr: p.rest_hr ?? 52, experience: p.experience || 'Returning',
  weekly: p.weekly ?? 28, goal: p.goal || 'return', injuries: p.injuries || [], pain: p.pain ?? 0,
});
const fromApiCheckin = (c) => ({
  sleep: c.sleep, soreness: c.soreness, pain: c.pain, symptoms: c.symptoms, runReady: c.run_ready,
});

/* ---- Web Push helpers ---- */
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

async function getPushState() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? 'on' : 'off';
  } catch (e) { return 'off'; }
}
async function enablePush() {
  if (!pushSupported()) return { ok: false, error: 'Not supported on this browser.' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, error: 'Notifications were blocked.' };
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const v = await api('/push/vapid');
  if (!v.ok || !v.data.publicKey) return { ok: false, error: 'Server push isn’t configured yet.' };
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(v.data.publicKey),
  });
  const r = await api('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) });
  return r.ok ? { ok: true } : { ok: false, error: r.data.error || 'Could not subscribe.' };
}
async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) {
    await api('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  }
  return { ok: true };
}

/* ---- run formatting ---- */
const fmtDur = (s) => {
  s = Math.round(+s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
};
const fmtPace = (distM, durS) => {
  distM = +distM; durS = +durS;
  if (!distM || !durS) return '—';
  const p = (durS / 60) / (distM / 1000);
  const m = Math.floor(p), s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
};
const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return ''; }
};

/* ---- IndexedDB (videos live on the device; metadata + thumb go to Postgres) ---- */
const IDB_NAME = 'pulseform';
const IDB_STORE = 'videos';
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(key, blob) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbDel(key) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
const newLocalId = () =>
  'v_' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() :
          Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

/* Extract a thumbnail + duration/dimensions from a video file. */
function extractVideoMeta(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.playsInline = true; v.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    let seeked = false;
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.6, (v.duration || 1) * 0.1); } catch (e) {} };
    v.onseeked = () => {
      if (seeked) return; seeked = true;
      try {
        const cv = document.createElement('canvas');
        const W = 320, ratio = (v.videoWidth || 4) / (v.videoHeight || 3);
        cv.width = W; cv.height = Math.round(W / ratio);
        cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        resolve({ thumb: cv.toDataURL('image/jpeg', 0.72),
          width: v.videoWidth, height: v.videoHeight, duration: v.duration });
      } catch (e) { reject(e); } finally { cleanup(); }
    };
    v.onerror = () => { cleanup(); reject(new Error('Could not read that video.')); };
  });
}

/* ---- icons (Lucide-style outline paths) -------------------- */
const ICON = {
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft:  <path d="M19 12H5M11 18l-6-6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3 5.5 5.5 0 0 0 12 5.5 5.5 5.5 0 0 0 7.5 3 5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  home: <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  calendar: <><path d="M8 2v4M16 2v4M3 10h18" /><path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></>,
  user: <><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  mail: <><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M22 7l-10 5L2 7" /></>,
  lock: <><path d="M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>,
  flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></>,
  gauge: <><path d="M3.34 19a10 10 0 1 1 17.32 0" /><path d="M12 14l3.5-3.5" /></>,
  wind: <path d="M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.5 8a2.5 2.5 0 1 1 2 4H2" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bluetooth: <path d="m7 7 10 10-5 5V2l5 5L7 17" />,
  trendingUp: <><path d="M22 7l-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  trendingDown: <><path d="M22 17l-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></>,
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
  droplet: <path d="M12 2.7s6 5.7 6 10.3a6 6 0 1 1-12 0C6 8.4 12 2.7 12 2.7z" />,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  scan: <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" />,
  cpu: <><path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M9 9h6v6H9z" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></>,
  play: <path d="M7 4v16l13-8z" />,
  ruler: <><path d="M3 9l6-6 12 12-6 6z" /><path d="M7 7l2 2M11 5l2 2M13 11l2 2M9 13l2 2" /></>,
  footprints: <path d="M4 16v-2.4C4 11 5.6 9 8 9s4 2 4 4.6V16M4 20h4M14 14v-2.4C14 9 15.6 7 18 7s2 2 2 4.6V14M16 18h4" />,
};
function Icon({ name, size = 20, stroke = 2, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round">
      {ICON[name] || null}
    </svg>
  );
}

/* ---- iOS-style status bar ---------------------------------- */
function StatusBar({ dark = false, over = false }) {
  return (
    <div className={cx('pf-status', dark && 'pf-status--dark', over && 'pf-status--over')}>
      <span className="pf-status__time">9:41</span>
      <span className="pf-status__icons">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="6" width="3" height="5" rx="1" />
          <rect x="4.5" y="4" width="3" height="7" rx="1" />
          <rect x="9" y="2" width="3" height="9" rx="1" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <path d="M8 2.2c2 0 3.8.8 5.2 2l1.1-1.2A9.4 9.4 0 0 0 8 .4 9.4 9.4 0 0 0 1.7 3l1.1 1.2A7.6 7.6 0 0 1 8 2.2z" opacity=".9" />
          <path d="M8 5.4c1.1 0 2.2.4 3 1.2l1.1-1.2A6 6 0 0 0 8 3.6a6 6 0 0 0-4.1 1.8L5 6.6c.8-.8 1.9-1.2 3-1.2z" />
          <circle cx="8" cy="9" r="1.6" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="1" y="1" width="21" height="10" rx="2.5" stroke="currentColor" opacity=".4" />
          <rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor" />
          <rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity=".5" />
        </svg>
      </span>
    </div>
  );
}

/* ---- bottom tab bar ---------------------------------------- */
function TabBar({ active, onChange }) {
  const tabs = [['today', 'Today', 'home'], ['form', 'Form', 'activity'], ['plan', 'Plan', 'calendar'], ['you', 'You', 'user']];
  return (
    <nav className="pf-tabbar">
      {tabs.map(([id, label, icon]) => (
        <button key={id} className={cx('pf-tab', active === id && 'pf-tab--on')} onClick={() => onChange(id)}>
          <Icon name={icon} size={22} stroke={active === id ? 2.4 : 2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

const ASSET = (p) => `assets/${p}`;

/* ============================================================
   Demo data model — grounded in the Pulseform parameter spec
   ============================================================ */
const CARDIO = {
  score: 78, tone: 'ready', trend: '+3',
  metrics: [
    { icon: 'heart', label: 'HRV Readiness', value: 78, sub: 'within baseline', tone: 'ready' },
    { icon: 'activity', label: 'Resting HR', value: 48, unit: 'bpm', sub: 'low & steady', tone: 'ready' },
    { icon: 'trendingUp', label: 'Training Load', value: 69, sub: 'moderate ramp-up', tone: 'accent' },
    { icon: 'wind', label: 'Decoupling', value: '6.1', unit: '%', sub: 'aerobic, efficient', tone: 'ready' },
  ],
  params: [
    { name: 'HRV', sub: 'Heart-rate variability', num: 62, unit: 'ms', tag: 'ready', note: 'Daily readiness' },
    { name: 'Cardiac drift', sub: 'HR rise at steady Zone 2', num: '4.2', unit: '%', tag: 'ready' },
    { name: 'HR recovery', sub: '60 s after effort', num: 32, unit: 'bpm', tag: 'ready' },
    { name: 'Decoupling', sub: 'Pace : HR efficiency', num: '6.1', unit: '%', tag: 'ready' },
    { name: 'VO₂max trend', sub: '8-week estimate', num: 52, unit: 'ml/kg', tag: 'ready' },
  ],
};

const BIOMECH = {
  score: 54, tone: 'caution', trend: '-2', updated: '2 days ago',
  params: [
    { name: 'Cadence', sub: 'Steps per minute', num: 172, unit: 'spm', tag: 'caution', flag: false },
    { name: 'Ground contact', sub: 'Foot-to-ground time', num: 248, unit: 'ms', tag: 'caution' },
    { name: 'Flight time', sub: 'Airborne phase', num: 118, unit: 'ms', tag: 'ready' },
    { name: 'Leg stiffness', sub: 'Spring efficiency', num: '9.8', unit: 'kN/m', tag: 'ready' },
    { name: 'Knee valgus index', sub: 'Inward knee collapse', num: 14, unit: '°', tag: 'strain', flag: true },
    { name: 'Pelvic drop', sub: 'Hip stability', num: 9, unit: '°', tag: 'caution', flag: true },
    { name: 'Tibial angle', sub: 'Shin at contact', num: 7, unit: '°', tag: 'ready' },
    { name: 'Overstride', sub: 'Foot ahead of body', num: 'Low', unit: '', tag: 'ready' },
  ],
};

const SIGNALS = [
  { label: 'Knee stability', value: 52, valueSuffix: '%' },
  { label: 'Recovery', value: 81, valueSuffix: '%' },
  { label: 'Cadence consistency', value: 74, valueSuffix: '%' },
];

const DRILLS = [
  ['Step-down control', '3 × 8 each side'],
  ['Side plank with leg raise', '3 × 30 sec'],
  ['Single-leg squat to box', '3 × 6 each side'],
];

const SESSION = [
  ['scan', 'Warm-up mobility', '8 min · hips & ankles'],
  ['activity', 'Easy run · Zone 2', '6 km · 5:40 /km'],
  ['bolt', 'Stability circuit', '3 rounds · knee focus'],
  ['wind', 'Cool-down', '5 min · easy'],
];

const GOALS = [
  { id: 'marathon', name: 'Marathon PB', desc: 'Build to race day without breaking down', icon: 'flag' },
  { id: 'return', name: 'Return from injury', desc: 'Rebuild load and trust your body again', icon: 'shield' },
  { id: 'healthy', name: 'Stay healthy', desc: 'Consistent, sustainable weekly running', icon: 'heart' },
  { id: 'faster', name: 'Get faster (5–10K)', desc: 'Sharpen speed while staying durable', icon: 'bolt' },
];
const INJURIES = ['Knee', 'Achilles', 'Hip / glute', 'Shin', 'Calf', 'Lower back', 'None'];
const EXPERIENCE = ['New', 'Returning', 'Regular', 'Competitive'];

/* ============================================================
   1 · Welcome
   ============================================================ */
function Welcome({ onStart, onLogin }) {
  return (
    <div className="pf-hero">
      <div className="pf-hero__bleed"><img src={ASSET('photos/runner-woman-strap.jpg')} alt="" /></div>
      <div className="pf-hero__scrim" />
      <StatusBar dark over />
      <div className="pf-hero__layer">
        <div className="pf-lockup rise" style={{ '--d': '0s' }}>
          <img src={ASSET('logo/pulseform-mark-white.png')} alt="" />
          <span className="pf-lockup__word">Pulseform</span>
        </div>
        <div className="pf-hero__spacer" />
        <span className="pf-eyebrow pf-eyebrow--light rise" style={{ '--d': '.08s' }}>One score · two signals</span>
        <h1 className="pf-hero__title rise" style={{ '--d': '.16s', marginTop: 12 }}>
          Train with your body, <em>not against it.</em>
        </h1>
        <p className="pf-hero__sub rise" style={{ '--d': '.24s' }}>
          Physiological readiness and biomechanical stability — merged into one daily run-readiness score.
        </p>
        <div className="pf-hero__cta rise" style={{ '--d': '.32s' }}>
          <Button size="lg" block onClick={onStart} trailingIcon={<Icon name="arrowRight" size={18} />}>
            Get started
          </Button>
          <button className="pf-linkbtn" onClick={onLogin}>I already have an account · <b>Log in</b></button>
        </div>
        <div className="pf-hero__meta rise" style={{ '--d': '.4s' }}>€199 sensor kit · €14.99/mo coaching</div>
      </div>
    </div>
  );
}

/* ============================================================
   2 · Login
   ============================================================ */
function Login({ onLogin, onBack, onCreate }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const submit = async () => {
    if (busy) return;
    setErr(null); setBusy(true);
    const r = await onLogin(email.trim(), pw);
    setBusy(false);
    if (!r.ok) setErr(r.error);
  };
  return (
    <div className="pf-screen pf-screen--paper">
      <StatusBar />
      <div className="pf-auth">
        <div className="pf-auth__head">
          <button className="pf-iconbtn" onClick={onBack} aria-label="Back"><Icon name="arrowLeft" size={20} /></button>
          <div className="pf-logo-badge" style={{ marginTop: 22 }}>
            <img src={ASSET('logo/pulseform-mark-white.png')} alt="Pulseform" />
          </div>
          <h1 className="pf-auth__title">Welcome back</h1>
          <p className="pf-auth__sub">Log in to see today’s run-readiness.</p>
        </div>

        <div className="pf-auth__form">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            leadingIcon={<Icon name="mail" size={18} />} placeholder="you@runner.com" autoComplete="email" />
          <Input label="Password" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} autoComplete="current-password" placeholder="Your password"
            leadingIcon={<Icon name="lock" size={18} />}
            trailingIcon={<span onClick={() => setShow(s => !s)} style={{ cursor: 'pointer' }}><Icon name="eye" size={18} /></span>} />
          {err && <div className="pf-auth__err">{err}</div>}
          <div className="pf-auth__row">
            <Switch label="Stay signed in" defaultChecked />
            <button className="pf-auth__forgot">Forgot?</button>
          </div>
          <Button size="lg" block disabled={busy} onClick={submit}
            trailingIcon={!busy && <Icon name="arrowRight" size={18} />}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </div>

        <div className="pf-auth__spacer" />
        <div className="pf-auth__foot">New here? <button onClick={onCreate}>Create account</button></div>
      </div>
    </div>
  );
}

/* ============================================================
   3 · Onboarding — the data queries (Datenabfragen)
   ============================================================ */
function Stepper({ value, set, min, max, step = 1, unit }) {
  return (
    <div className="pf-stepper">
      <button className="pf-round" onClick={() => set(clamp(value - step, min, max))} aria-label="decrease"><Icon name="minus" size={18} /></button>
      <span className="pf-stepper__val">{value}<small>{unit}</small></span>
      <button className="pf-round" onClick={() => set(clamp(value + step, min, max))} aria-label="increase"><Icon name="plus" size={18} /></button>
    </div>
  );
}
function Field({ label, children }) {
  return <label className="pf-field"><span className="pf-field__label">{label}</span>{children}</label>;
}
function Segmented({ options, value, set }) {
  return (
    <div className="pf-seg">
      {options.map(o => (
        <button key={o} className={cx(value === o && 'pf-seg--on')} onClick={() => set(o)}>{o}</button>
      ))}
    </div>
  );
}

function Onboarding({ profile, setProfile, authed, onFinish, onExit }) {
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [acct, setAcct] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);
  const p = profile;
  const upd = (patch) => setProfile({ ...p, ...patch });
  const toggleInjury = (i) => {
    if (i === 'None') return upd({ injuries: ['None'] });
    const next = p.injuries.filter(x => x !== 'None');
    upd({ injuries: next.includes(i) ? next.filter(x => x !== i) : [...next, i] });
  };

  const baseSteps = [
    {
      eyebrow: 'About you', q: 'What should we call you?',
      hint: 'We personalise your plan and coaching around you.',
      body: (
        <div className="pf-fields">
          <Field label="First name"><div className="pf-input-wrap"><input className="pf-input" value={p.name} placeholder="Your name" onChange={e => upd({ name: e.target.value })} /></div></Field>
          <Field label="Biological sex (for baselines)"><Segmented options={['Female', 'Male']} value={p.sex} set={v => upd({ sex: v })} /></Field>
        </div>
      ),
    },
    {
      eyebrow: 'Body basics', q: 'A few numbers to calibrate.',
      hint: 'Used to normalise your scores into unit-free values.',
      body: (
        <div className="pf-fields">
          <Field label="Age"><Stepper value={p.age} set={v => upd({ age: v })} min={14} max={90} unit=" yrs" /></Field>
          <div className="pf-fields__row">
            <Field label="Height"><Stepper value={p.height} set={v => upd({ height: v })} min={130} max={210} unit=" cm" /></Field>
            <Field label="Weight"><Stepper value={p.weight} set={v => upd({ weight: v })} min={35} max={160} unit=" kg" /></Field>
          </div>
          <Field label="Resting heart rate"><Stepper value={p.restHr} set={v => upd({ restHr: v })} min={35} max={90} unit=" bpm" /></Field>
        </div>
      ),
    },
    {
      eyebrow: 'Your running', q: 'Where are you right now?',
      hint: 'This sets your starting load and how fast we progress it.',
      body: (
        <div className="pf-fields">
          <Field label="Experience level"><Segmented options={EXPERIENCE} value={p.experience} set={v => upd({ experience: v })} /></Field>
          <div className="pf-slider" style={{ marginTop: 4 }}>
            <div className="pf-slider__top"><span className="pf-slider__lab">Weekly distance</span><span className="pf-slider__num">{p.weekly} km</span></div>
            <input type="range" className="pf-range" min="0" max="100" value={p.weekly} onChange={e => upd({ weekly: +e.target.value })} />
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'Your goal', q: 'What are you training for?',
      hint: 'Pick the one that fits best — you can change it later.',
      body: (
        <div>
          {GOALS.map(g => (
            <button key={g.id} className={cx('pf-opt', p.goal === g.id && 'pf-opt--on')} onClick={() => upd({ goal: g.id })}>
              <span className="pf-opt__ic"><Icon name={g.icon} size={20} /></span>
              <span className="pf-opt__body"><span className="pf-opt__name">{g.name}</span><span className="pf-opt__desc">{g.desc}</span></span>
              <span className="pf-opt__check">{p.goal === g.id && <Icon name="check" size={14} />}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      eyebrow: 'Health & history', q: 'Any niggles we should know about?',
      hint: 'We adapt biomechanics drills and load around these.',
      body: (
        <div className="pf-fields">
          <Field label="Past or current issues (select any)">
            <div className="pf-chips">
              {INJURIES.map(i => (
                <button key={i} className={cx('pf-chip', p.injuries.includes(i) && 'pf-chip--on')} onClick={() => toggleInjury(i)}>{i}</button>
              ))}
            </div>
          </Field>
          <div className="pf-slider" style={{ marginTop: 8 }}>
            <div className="pf-slider__top"><span className="pf-slider__lab">Pain right now</span><span className="pf-slider__num">{p.pain === 0 ? 'None' : p.pain + ' / 10'}</span></div>
            <input type="range" className="pf-range" min="0" max="10" value={p.pain} onChange={e => upd({ pain: +e.target.value })} />
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'Sensor', q: 'Connect your Pulseform.', sensor: true,
      hint: 'The strap captures movement, impact and fatigue every run.',
      body: (
        <div className="pf-pair">
          <div className="pf-pair__ring">
            <span className="pf-pair__pulse" /><span className="pf-pair__pulse" /><span className="pf-pair__pulse" />
            <span className="pf-pair__core"><img src={ASSET('logo/pulseform-mark-white.png')} alt="" /></span>
          </div>
          <Badge tone="ready" dot>Sensor found · 100% battery</Badge>
          <p className="pf-ob__hint" style={{ marginTop: 16, textAlign: 'center' }}>
            Pulseform strap · firmware up to date. Wear it on your next run for a full biomechanical read.
          </p>
        </div>
      ),
    },
  ];

  const accountStep = {
    eyebrow: 'Your account', q: 'Save your progress.', account: true,
    hint: 'Create an account so your baseline and daily check-ins sync across your devices.',
    body: (
      <div className="pf-fields">
        <Field label="Email">
          <div className="pf-input-wrap">
            <span className="pf-input__adorn"><Icon name="mail" size={18} /></span>
            <input className="pf-input" type="email" autoComplete="email" placeholder="you@runner.com"
              value={acct.email} onChange={e => setAcct({ ...acct, email: e.target.value })} />
          </div>
        </Field>
        <Field label="Password">
          <div className="pf-input-wrap">
            <span className="pf-input__adorn"><Icon name="lock" size={18} /></span>
            <input className="pf-input" type="password" autoComplete="new-password" placeholder="At least 6 characters"
              value={acct.password} onChange={e => setAcct({ ...acct, password: e.target.value })} />
          </div>
        </Field>
        {err && <div className="pf-auth__err">{err}</div>}
      </div>
    ),
  };
  const steps = authed ? baseSteps : [...baseSteps, accountStep];

  const last = step === steps.length - 1;
  const s = steps[step];
  const finalize = async () => {
    if (!authed) {
      const e = acct.email.trim();
      if (!/.+@.+\..+/.test(e)) return setErr('Enter a valid email address.');
      if (acct.password.length < 6) return setErr('Password must be at least 6 characters.');
    }
    setErr(null);
    setBuilding(true);
    const r = await onFinish(authed ? null : { email: acct.email.trim(), password: acct.password });
    if (!r || !r.ok) { setBuilding(false); setErr((r && r.error) || 'Something went wrong.'); setStep(steps.length - 1); }
    // on success the parent switches phase and unmounts this screen
  };
  const next = () => { if (last) return finalize(); setStep(step + 1); };

  if (building) {
    return (
      <div className="pf-screen pf-screen--paper">
        <StatusBar />
        <div className="pf-pair" style={{ margin: 'auto' }}>
          <div className="pf-pair__ring">
            <span className="pf-pair__pulse" /><span className="pf-pair__pulse" /><span className="pf-pair__pulse" />
            <span className="pf-pair__core"><img src={ASSET('logo/pulseform-mark-white.png')} alt="" /></span>
          </div>
          <h2 className="pf-ob__q" style={{ textAlign: 'center' }}>Building your baseline…</h2>
          <p className="pf-ob__hint" style={{ textAlign: 'center' }}>Merging physiology and biomechanics into your run-readiness.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-screen pf-screen--paper">
      <StatusBar />
      <div className="pf-ob">
        <div className="pf-ob__top">
          {step > 0
            ? <button className="pf-iconbtn" onClick={() => { setErr(null); setStep(step - 1); }} aria-label="Back"><Icon name="arrowLeft" size={20} /></button>
            : <button className="pf-iconbtn" onClick={onExit} aria-label="Exit"><Icon name="x" size={20} /></button>}
          <div className="pf-ob__progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          <span className="pf-ob__step">{step + 1}/{steps.length}</span>
        </div>
        <div className="pf-ob__body" key={step}>
          <div className="rise">
            <span className="pf-eyebrow pf-eyebrow--accent pf-ob__eyebrow" style={{ display: 'block' }}>{s.eyebrow}</span>
            <h2 className="pf-ob__q">{s.q}</h2>
            <p className="pf-ob__hint">{s.hint}</p>
          </div>
          <div className="rise" style={{ '--d': '.06s' }}>{s.body}</div>
        </div>
        <div className="pf-ob__foot">
          <Button size="lg" block onClick={next} trailingIcon={!last && <Icon name="arrowRight" size={18} />}>
            {last ? (authed ? 'Build my baseline' : 'Create account & build') : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Score breakdown card (used on dashboard)
   ============================================================ */
function BreakdownCard({ tone, cap, value, name, trend, trendUp, onClick }) {
  return (
    <button className={cx('pf-bd', `pf-bd--${tone}`)} onClick={onClick}>
      <div className="pf-bd__top">
        <span className="pf-bd__ic"><Icon name={cap === 'Cardio' ? 'heart' : 'activity'} size={18} /></span>
        <Icon name="chevronRight" size={18} className="pf-drill__chev" />
      </div>
      <div className="pf-bd__cad">{cap === 'Cardio' ? 'Daily' : 'Weekly'}</div>
      <div className="pf-bd__val">{value}<small> /100</small></div>
      <div className="pf-bd__name">{name}</div>
      <div className="pf-bd__trend" style={{ color: trendUp ? 'var(--teal-600)' : 'var(--caution-600)' }}>
        <Icon name={trendUp ? 'trendingUp' : 'trendingDown'} size={13} />{trend} this week
      </div>
    </button>
  );
}

/* ============================================================
   4 · Today — Run-Readiness + Cardiovascular (Fitness Scores)
   ============================================================ */
function Today({ profile, checkin, runReady, symptoms, goForm, goCardio, openCheckin }) {
  const first = (profile.name || 'Jordan').split(' ')[0];
  const readyTone = runReady >= 67 ? 'ready' : runReady >= 40 ? 'caution' : 'strain';
  const badgeText = runReady >= 67 ? 'Good to push today' : runReady >= 40 ? 'Train, but adapt intensity' : 'Hold back — recover';
  return (
    <div className="pf-screen">
      <StatusBar />
      <div className="pf-scroll">
        <header className="pf-apphead rise">
          <div>
            <span className="pf-eyebrow">Tuesday · Easy week</span>
            <h2 className="pf-apphead__title">Good morning, {first}</h2>
          </div>
          <Avatar name={profile.name || 'Jordan Diaz'} />
        </header>

        <Card className={cx('pf-scorecard', `pf-scorecard--${readyTone}`, 'rise')} style={{ '--d': '.05s' }}>
          <div className="pf-scorecard__cap">RunReady Score</div>
          <ScoreRing value={runReady} size={196} thickness={15} tone={readyTone} />
          <Badge tone={readyTone} dot>{badgeText}</Badge>
          <p className="pf-scorecard__sub">Your physiology says go — your knee stability says ease the intensity.</p>
        </Card>

        <div className="pf-breakdown rise" style={{ '--d': '.1s' }}>
          <BreakdownCard tone="ready" cap="Cardio" value={CARDIO.score} name="Cardiovascular" trend="+3" trendUp onClick={goCardio} />
          <BreakdownCard tone="caution" cap="Form" value={BIOMECH.score} name="Biomechanical" trend="2" trendUp={false} onClick={goForm} />
        </div>

        {checkin
          ? (
            <div className="pf-checkin rise" style={{ '--d': '.14s', background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }} onClick={openCheckin}>
              <span className="pf-checkin__ic" style={{ background: 'var(--ready-50)', color: 'var(--teal-700)' }}><Icon name="check" size={20} /></span>
              <div className="pf-checkin__body">
                <div className="pf-checkin__t" style={{ color: 'var(--text-strong)' }}>Checked in for today</div>
                <div className="pf-checkin__d" style={{ color: 'var(--text-muted)' }}>Symptoms {symptoms}/100 · tap to update</div>
              </div>
            </div>
          )
          : (
            <div className="pf-checkin rise" style={{ '--d': '.14s' }} onClick={openCheckin}>
              <span className="pf-checkin__ic"><Icon name="droplet" size={20} /></span>
              <div className="pf-checkin__body">
                <div className="pf-checkin__t">How do you feel today?</div>
                <div className="pf-checkin__d">30-sec check-in tunes your readiness</div>
              </div>
              <Icon name="chevronRight" size={20} className="pf-drill__chev" />
            </div>
          )}

        <div className="pf-section-label rise" style={{ '--d': '.16s' }}>Cardiovascular signals <span style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', color: 'var(--text-faint)', fontWeight: 600 }}>Daily</span></div>
        <div className="pf-metricgrid rise" style={{ '--d': '.18s' }}>
          {CARDIO.metrics.map((m, i) => (
            <MetricCard key={i} icon={<Icon name={m.icon} size={18} />} label={m.label} value={m.value} unit={m.unit} sub={m.sub} tone={m.tone} />
          ))}
        </div>

        <div className="pf-section-label rise" style={{ '--d': '.2s' }}>Stability signals today</div>
        <Card className="rise" style={{ '--d': '.22s' }}>
          <div className="pf-signals__list">
            {SIGNALS.map((s, i) => <SignalBar key={i} label={s.label} value={s.value} valueSuffix={s.valueSuffix} />)}
          </div>
        </Card>

        <div className="pf-scroll__pad" />
      </div>
    </div>
  );
}

/* ============================================================
   5 · Form — Biomechanical Score
   ============================================================ */
function GaitFigure() {
  // Front-view schematic: right knee in valgus, slight pelvic drop on the right.
  return (
    <svg className="pf-gait-svg" width="104" height="148" viewBox="0 0 104 148" fill="none">
      {/* reference plumb line from right hip */}
      <line x1="80" y1="40" x2="80" y2="140" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" strokeDasharray="3 4" />
      {/* pelvis (dropped on the right) */}
      <line x1="26" y1="38" x2="80" y2="45" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      {/* torso */}
      <line x1="53" y1="41" x2="53" y2="14" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="53" cy="9" r="6" stroke="rgba(255,255,255,0.55)" strokeWidth="2.4" />
      {/* left leg — stable, teal */}
      <line x1="26" y1="38" x2="24" y2="90" stroke="var(--teal-300)" strokeWidth="3.4" strokeLinecap="round" />
      <line x1="24" y1="90" x2="22" y2="138" stroke="var(--teal-300)" strokeWidth="3.4" strokeLinecap="round" />
      {/* right leg — valgus, caution/strain */}
      <line x1="80" y1="45" x2="64" y2="92" stroke="var(--caution-500)" strokeWidth="3.6" strokeLinecap="round" />
      <line x1="64" y1="92" x2="82" y2="138" stroke="var(--strain-500)" strokeWidth="3.6" strokeLinecap="round" />
      {/* joints */}
      {[[26, 38], [80, 45], [24, 90], [22, 138], [82, 138]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill="#fff" />)}
      <circle cx="64" cy="92" r="4.6" fill="var(--strain-500)" stroke="#fff" strokeWidth="1.6" />
      {/* valgus marker */}
      <text className="pf-callout pf-callout--v" x="40" y="86">14°</text>
    </svg>
  );
}

function Form({ goPlan }) {
  const limiters = BIOMECH.params.filter(p => p.flag);
  return (
    <div className="pf-screen">
      <StatusBar />
      <div className="pf-scroll">
        <header className="pf-apphead rise">
          <div>
            <span className="pf-eyebrow">Biomechanics</span>
            <h2 className="pf-apphead__title">How you move</h2>
          </div>
          <Badge tone="neutral" mono>Updated {BIOMECH.updated}</Badge>
        </header>

        <div className="pf-bio-hero rise" style={{ '--d': '.04s' }}>
          <div className="pf-bio-hero__fig"><GaitFigure /></div>
          <div className="pf-bio-hero__meta">
            <div className="pf-bio-hero__cap">Biomechanical Score</div>
            <div className="pf-bio-hero__val">{BIOMECH.score}<small> /100</small></div>
            <div className="pf-bio-hero__note">Right knee collapses inward under fatigue. Hip control is the limiter — not your engine.</div>
          </div>
        </div>

        <div className="pf-section-label rise" style={{ '--d': '.08s' }}>Flagged this week</div>
        <Card variant="accent" className="rise" style={{ '--d': '.1s' }}>
          <ul className="pf-why__list">
            {limiters.map((l, i) => (
              <li key={i}>
                <span className={`pf-why__dot pf-why__dot--${l.tag}`} />
                <span><b>{l.name} · {l.num}{l.unit}</b> — {l.name === 'Knee valgus index' ? 'above your safe range; main injury-risk driver.' : 'hip drops as you tire, feeding the knee collapse.'}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="pf-section-label rise" style={{ '--d': '.12s' }}>Gait parameters</div>
        <Card className="rise" style={{ '--d': '.14s', padding: '4px 16px' }}>
          {BIOMECH.params.map((p, i) => (
            <div className="pf-param" key={i}>
              <div className="pf-param__body">
                <div className="pf-param__name">{p.name}{p.flag && <span className={`pf-tag pf-tag--${p.tag}`}>watch</span>}</div>
                <div className="pf-param__sub">{p.sub}</div>
              </div>
              <div className="pf-param__val">
                <span className="pf-param__num">{p.num}<span className="pf-param__unit">{p.unit}</span></span>
              </div>
            </div>
          ))}
        </Card>

        <VideoAnalysis />

        <div style={{ marginTop: 18 }} className="rise">
          <Button size="lg" block onClick={goPlan} trailingIcon={<Icon name="arrowRight" size={18} />}>
            See how training adapts
          </Button>
        </div>
        <div className="pf-scroll__pad" />
      </div>
    </div>
  );
}

/* ============================================================
   6 · Plan — Training tips (adaptive recommendation)
   ============================================================ */
function Plan({ runReady, onStart }) {
  return (
    <div className="pf-screen">
      <StatusBar />
      <div className="pf-scroll">
        <header className="pf-apphead rise">
          <div>
            <span className="pf-eyebrow">Adaptive coaching</span>
            <h2 className="pf-apphead__title">Tomorrow’s training</h2>
          </div>
          <Badge tone="accent" mono>Adapted</Badge>
        </header>

        <div className="pf-plan-hero rise" style={{ '--d': '.04s' }}>
          <div className="pf-plan-hero__cap">Adjusted for your knee</div>
          <div className="pf-plan-hero__title">Easy run + stability</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>
            We swapped tomorrow’s tempo block for Zone 2 plus a knee-stability circuit.
          </div>
          <div className="pf-plan-hero__row">
            <div className="pf-plan-hero__stat"><small>Was</small><b className="pf-strike">8 km</b><i>tempo</i></div>
            <div className="pf-plan-hero__stat"><small>Now</small><b>6 km</b><i>easy · Z2</i></div>
            <div className="pf-plan-hero__stat"><small>RunReady</small><b>{runReady}</b><i>/ 100</i></div>
          </div>
        </div>

        <div className="pf-section-label rise" style={{ '--d': '.08s' }}>Why we changed it</div>
        <Card variant="accent" className="rise" style={{ '--d': '.1s' }}>
          <ul className="pf-why__list">
            <li><span className="pf-why__dot pf-why__dot--ready" /><span>HRV is within baseline — your engine is recovered</span></li>
            <li><span className="pf-why__dot pf-why__dot--caution" /><span>Cadence drift increased after 7.8 km last run</span></li>
            <li><span className="pf-why__dot pf-why__dot--strain" /><span>Right knee tracking changed repeatedly under fatigue</span></li>
          </ul>
        </Card>

        <div className="pf-section-label rise" style={{ '--d': '.12s' }}>Tomorrow’s session</div>
        <div className="rise" style={{ '--d': '.14s' }}>
          {SESSION.map(([ic, t, d], i) => (
            <div className="pf-sessrow" key={i}>
              <span className="pf-sessrow__ic"><Icon name={ic} size={20} /></span>
              <div className="pf-sessrow__body"><div className="pf-sessrow__t">{t}</div><div className="pf-sessrow__d">{d}</div></div>
            </div>
          ))}
        </div>

        <div className="pf-section-label rise" style={{ '--d': '.16s' }}>Stability focus</div>
        <div className="pf-drills rise" style={{ '--d': '.18s' }}>
          {DRILLS.map(([name, dose], i) => (
            <button className="pf-drill" key={i}>
              <span className="pf-drill__dot" />
              <span className="pf-drill__body"><span className="pf-drill__name">{name}</span><span className="pf-drill__dose">{dose}</span></span>
              <Icon name="chevronRight" size={18} className="pf-drill__chev" />
            </button>
          ))}
        </div>

        <div className="pf-adapt-actions rise" style={{ '--d': '.2s' }}>
          <Button size="lg" block onClick={onStart} leadingIcon={<Icon name="play" size={18} />}>Start adapted session</Button>
          <Button variant="ghost" block>Keep original plan</Button>
        </div>
        <div className="pf-scroll__pad" />
      </div>
    </div>
  );
}

/* ---- Notifications toggle (used on the You screen) ---- */
function NotificationToggle() {
  const [state, setState] = useState('loading');  // loading|on|off|denied|unsupported|needs-install
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { (async () => setState(await getPushState()))(); }, []);
  const toggle = async () => {
    if (busy) return;
    setBusy(true); setMsg(null);
    if (state === 'on') { await disablePush(); setState('off'); }
    else {
      const r = await enablePush();
      if (r.ok) setState('on');
      else { setState(Notification.permission === 'denied' ? 'denied' : 'off'); setMsg(r.error); }
    }
    setBusy(false);
  };
  const sendTest = async () => {
    setMsg('Sending…');
    const r = await api('/push/test', { method: 'POST' });
    setMsg(r.ok ? 'Sent — check your notifications.' : (r.data.error || 'Could not send.'));
  };
  const label = {
    loading: 'Checking…', on: 'On · 8:00 each morning', off: 'Off — tap to enable',
    denied: 'Blocked in your browser settings', unsupported: 'Not supported on this browser',
    'needs-install': 'Add to Home Screen first (iPhone)',
  }[state];
  const switchable = state === 'on' || state === 'off';
  return (
    <>
      <div className="pf-list__row">
        <span className="pf-list__ic"><Icon name="bell" size={18} /></span>
        <div className="pf-list__body">
          <div className="pf-list__t">Daily check-in reminder</div>
          <div className="pf-list__d">{msg || label}</div>
        </div>
        {switchable && <Switch checked={state === 'on'} onChange={toggle} disabled={busy} />}
      </div>
      {state === 'on' && (
        <div className="pf-list__row" onClick={sendTest} style={{ cursor: 'pointer' }}>
          <span className="pf-list__ic"><Icon name="play" size={18} /></span>
          <div className="pf-list__body"><div className="pf-list__t">Send a test notification</div></div>
          <Icon name="chevronRight" size={18} className="pf-drill__chev" />
        </div>
      )}
    </>
  );
}

/* ---- Video analysis (used on the Form screen) ----
   Capture: native camera via <input capture="environment">, or file picker.
   Storage: video blob → IndexedDB on this device; thumb + metadata → Postgres.
*/
const VIDEO_KINDS = [
  { id: 'side', name: 'Side-on', hint: 'Best for cadence, knee tracking' },
  { id: 'front', name: 'Front-on', hint: 'Best for valgus & pelvic drop' },
  { id: 'rear',  name: 'Rear-on', hint: 'Best for foot strike & pronation' },
];

function VideoCapture({ onSaved }) {
  const cameraRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handle = async (file) => {
    if (!file) return;
    setErr(null); setBusy(true);
    try {
      const meta = await extractVideoMeta(file);
      const localId = newLocalId();
      await idbPut(localId, file);
      const body = {
        local_id: localId, kind: 'side',
        duration_s: Math.round((meta.duration || 0) * 10) / 10,
        width: meta.width, height: meta.height, thumb: meta.thumb,
      };
      const r = await api('/videos', { method: 'POST', body: JSON.stringify(body) });
      if (!r.ok) { await idbDel(localId); throw new Error(r.data.error || 'Could not save.'); }
      onSaved && onSaved(r.data.video);
    } catch (e) { setErr(e.message || 'Could not import that video.'); }
    finally { setBusy(false); }
  };
  const onCamera = (e) => { handle(e.target.files && e.target.files[0]); e.target.value = ''; };
  const onUpload = (e) => { handle(e.target.files && e.target.files[0]); e.target.value = ''; };

  return (
    <div className="pf-vid-cta">
      <button className="pf-vid-cta__btn pf-vid-cta__btn--primary"
        onClick={() => cameraRef.current && cameraRef.current.click()} disabled={busy}>
        <span className="pf-vid-cta__ic"><Icon name="play" size={22} /></span>
        <span className="pf-vid-cta__body">
          <span className="pf-vid-cta__t">{busy ? 'Processing…' : 'Record analysis video'}</span>
          <span className="pf-vid-cta__d">8–10 sec at steady pace</span>
        </span>
      </button>
      <button className="pf-vid-cta__btn"
        onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}>
        <span className="pf-vid-cta__ic"><Icon name="plus" size={20} /></span>
        <span className="pf-vid-cta__body">
          <span className="pf-vid-cta__t">Upload from library</span>
          <span className="pf-vid-cta__d">Pick an existing clip</span>
        </span>
      </button>
      {err && <div className="pf-auth__err">{err}</div>}
      <input ref={cameraRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }} onChange={onCamera} />
      <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={onUpload} />
    </div>
  );
}

function VideoPlayer({ video, onClose, onDelete }) {
  const [url, setUrl] = useState(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true, objectUrl = null;
    (async () => {
      const blob = await idbGet(video.local_id).catch(() => null);
      if (!active) return;
      if (!blob) return setMissing(true);
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [video.local_id]);
  return (
    <>
      <div className="pf-sheet-scrim" onClick={onClose} />
      <div className="pf-sheet pf-sheet--video">
        <div className="pf-sheet__grab" />
        <h3 className="pf-sheet__title">{VIDEO_KINDS.find(k => k.id === video.kind)?.name || 'Analysis video'}</h3>
        <p className="pf-sheet__sub">{fmtDate(video.recorded_at)} · {fmtDur(video.duration_s)}</p>
        {missing ? (
          <div className="pf-vid-missing">
            <Icon name="info" size={20} />
            <span>This video was recorded on another device — it isn’t stored here.</span>
          </div>
        ) : url ? (
          <video src={url} className="pf-vid-player" controls autoPlay playsInline muted />
        ) : (
          <div className="pf-vid-player pf-vid-player--loading" />
        )}
        <div className="pf-adapt-actions" style={{ marginTop: 14 }}>
          <Button block onClick={onClose}>Done</Button>
          <Button variant="ghost" block onClick={() => onDelete(video)}>Delete video</Button>
        </div>
      </div>
    </>
  );
}

function VideoAnalysis() {
  const [videos, setVideos] = useState([]);
  const [playing, setPlaying] = useState(null);
  const load = async () => { const r = await api('/videos'); if (r.ok) setVideos(r.data.videos || []); };
  useEffect(() => { load(); }, []);
  const onDelete = async (v) => {
    await api('/videos?id=' + v.id, { method: 'DELETE' });
    await idbDel(v.local_id).catch(() => {});
    setPlaying(null); load();
  };
  return (
    <>
      <div className="pf-section-label rise" style={{ '--d': '.24s' }}>Video analysis</div>
      <Card className="rise" style={{ '--d': '.26s' }}>
        <VideoCapture onSaved={() => load()} />
        {videos.length > 0 && (
          <div className="pf-vidgrid">
            {videos.map(v => (
              <button key={v.id} className="pf-vid" onClick={() => setPlaying(v)}>
                {v.thumb
                  ? <img src={v.thumb} alt="" />
                  : <div className="pf-vid__placeholder"><Icon name="activity" size={28} /></div>}
                <span className="pf-vid__play"><Icon name="play" size={18} /></span>
                <div className="pf-vid__meta">
                  <span>{fmtDate(v.recorded_at)}</span>
                  <span>{fmtDur(v.duration_s)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} onDelete={onDelete} />}
    </>
  );
}

/* ---- Garmin / device run import (used on the You screen) ---- */
function ImportRuns() {
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState(null);
  const inputRef = React.useRef(null);
  const load = async () => { const r = await api('/runs'); if (r.ok) setRuns(r.data.runs || []); };
  useEffect(() => { load(); }, []);
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setStatus(`Importing ${file.name}…`);
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch(`/api/import?name=${encodeURIComponent(file.name)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' }, body: buf,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.run) { setStatus(`Imported ${(+data.run.distance_m / 1000).toFixed(1)} km`); load(); }
      else setStatus(data.error || 'Could not import that file.');
    } catch (err) { setStatus('Could not read that file.'); }
  };
  return (
    <>
      <div className="pf-section-label rise" style={{ '--d': '.18s' }}>Devices &amp; data</div>
      <div className="pf-list rise" style={{ '--d': '.2s' }}>
        <div className="pf-list__row" onClick={() => inputRef.current && inputRef.current.click()} style={{ cursor: 'pointer' }}>
          <span className="pf-list__ic"><Icon name="activity" size={18} /></span>
          <div className="pf-list__body">
            <div className="pf-list__t">Import a run</div>
            <div className="pf-list__d">{status || 'Garmin export · .fit / .tcx / .gpx'}</div>
          </div>
          <Icon name="plus" size={18} className="pf-drill__chev" />
          <input ref={inputRef} type="file" accept=".fit,.tcx,.gpx" style={{ display: 'none' }} onChange={onFile} />
        </div>
        {runs.map((r) => (
          <div className="pf-list__row" key={r.id}>
            <span className="pf-list__ic" style={{ background: 'var(--accent-soft)', color: 'var(--text-accent)' }}><Icon name="activity" size={18} /></span>
            <div className="pf-list__body">
              <div className="pf-list__t">{(+r.distance_m / 1000).toFixed(1)} km · {fmtDur(r.duration_s)}</div>
              <div className="pf-list__d">
                {fmtDate(r.started_at)} · {String(r.source).toUpperCase()} · {fmtPace(r.distance_m, r.duration_s)}
                {r.avg_hr ? ` · ${r.avg_hr} bpm` : ''}{r.avg_cadence ? ` · ${r.avg_cadence} spm` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   7 · You — profile
   ============================================================ */
function You({ profile, user, onLogout }) {
  const goal = GOALS.find(g => g.id === profile.goal);
  return (
    <div className="pf-screen">
      <StatusBar />
      <div className="pf-scroll">
        <header className="pf-apphead rise"><h2 className="pf-apphead__title">You</h2><Icon name="sliders" size={22} /></header>

        <div className="pf-profile-head rise" style={{ '--d': '.04s' }}>
          <Avatar name={profile.name || 'Jordan Diaz'} size="lg" />
          <div className="pf-profile-head__meta">
            <h2>{profile.name || 'Runner'}</h2>
            <p>{user?.email || (goal ? goal.name : 'Runner')}</p>
          </div>
        </div>

        <Card className="rise" style={{ '--d': '.08s' }}>
          <div className="pf-sensor-card">
            <span className="pf-sensor-card__ic"><Icon name="bluetooth" size={22} /></span>
            <div style={{ flex: 1 }}>
              <div className="pf-sessrow__t">Pulseform sensor</div>
              <div className="pf-sessrow__d"><span className="pf-livedot" style={{ marginRight: 6 }} />Connected · 100%</div>
            </div>
            <Badge tone="ready" dot>Live</Badge>
          </div>
        </Card>

        <div className="pf-section-label rise" style={{ '--d': '.1s' }}>Your data</div>
        <div className="pf-list rise" style={{ '--d': '.12s' }}>
          {[
            ['user', 'Profile & baselines', `${profile.age} yrs · ${profile.height} cm · ${profile.weight} kg`],
            ['heart', 'Resting heart rate', `${profile.restHr} bpm`],
            ['target', 'Goal', goal ? goal.name : '—'],
            ['shield', 'Injury history', profile.injuries.join(', ') || 'None'],
            ['gauge', 'Weekly distance', `${profile.weekly} km`],
          ].map(([ic, t, val], i) => (
            <div className="pf-list__row" key={i}>
              <span className="pf-list__ic"><Icon name={ic} size={18} /></span>
              <div className="pf-list__body"><div className="pf-list__t">{t}</div><div className="pf-list__d">{val}</div></div>
              <Icon name="chevronRight" size={18} className="pf-drill__chev" />
            </div>
          ))}
        </div>

        <div className="pf-section-label rise" style={{ '--d': '.14s' }}>Settings</div>
        <div className="pf-list rise" style={{ '--d': '.16s' }}>
          <NotificationToggle />
          {[['sliders', 'Units & display', 'Metric'], ['shield', 'Privacy & data', 'On-device first']].map(([ic, t, d], i) => (
            <div className="pf-list__row" key={i}>
              <span className="pf-list__ic"><Icon name={ic} size={18} /></span>
              <div className="pf-list__body"><div className="pf-list__t">{t}</div><div className="pf-list__d">{d}</div></div>
              <Icon name="chevronRight" size={18} className="pf-drill__chev" />
            </div>
          ))}
        </div>

        <ImportRuns />

        <div style={{ marginTop: 20 }} className="rise">
          <Button variant="secondary" block leadingIcon={<Icon name="logout" size={18} />} onClick={onLogout}>Log out</Button>
        </div>
        <div className="pf-scroll__pad" />
      </div>
    </div>
  );
}

/* ============================================================
   Daily check-in — bottom sheet (a data query)
   ============================================================ */
function Faces({ value, set, labels }) {
  return (
    <div className="pf-faces">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} className={cx('pf-face', value === n && 'pf-face--on')} onClick={() => set(n)} title={labels[n - 1]}>{n}</button>
      ))}
    </div>
  );
}
function CheckInSheet({ initial, onClose, onSave }) {
  const [sleep, setSleep] = useState(initial?.sleep ?? 4);
  const [soreness, setSoreness] = useState(initial?.soreness ?? 2);
  const [pain, setPain] = useState(initial?.pain ?? 'None');
  return (
    <>
      <div className="pf-sheet-scrim" onClick={onClose} />
      <div className="pf-sheet">
        <div className="pf-sheet__grab" />
        <h3 className="pf-sheet__title">Morning check-in</h3>
        <p className="pf-sheet__sub">Subjective signals tune today’s readiness.</p>

        <div className="pf-sheet__group">
          <div className="pf-sheet__lab">How rested do you feel?</div>
          <Faces value={sleep} set={setSleep} labels={['Wrecked', 'Tired', 'OK', 'Good', 'Great']} />
        </div>
        <div className="pf-sheet__group">
          <div className="pf-sheet__lab">Muscle soreness</div>
          <Faces value={soreness} set={setSoreness} labels={['None', 'Light', 'Some', 'High', 'Severe']} />
        </div>
        <div className="pf-sheet__group">
          <div className="pf-sheet__lab">Any pain today?</div>
          <Segmented options={['None', 'Mild', 'Strong']} value={pain} set={setPain} />
        </div>

        <Button size="lg" block onClick={() => onSave({ sleep, soreness, pain })}>Update my readiness</Button>
        <div style={{ height: 6 }} />
        <Button variant="ghost" block onClick={onClose}>Not now</Button>
      </div>
    </>
  );
}

/* ============================================================
   Root — navigation + state
   ============================================================ */
function computeSymptoms(c) {
  if (!c) return 86;
  const painIdx = c.pain === 'None' ? 0 : c.pain === 'Mild' ? 1 : 2;
  return clamp(Math.round(86 + (c.sleep - 4) * 4 - (c.soreness - 2) * 6 - painIdx * 16), 20, 99);
}

function Splash() {
  return (
    <div className="pf-screen pf-screen--dark">
      <StatusBar dark />
      <div className="pf-pair" style={{ margin: 'auto' }}>
        <div className="pf-pair__ring">
          <span className="pf-pair__pulse" /><span className="pf-pair__pulse" /><span className="pf-pair__pulse" />
          <span className="pf-pair__core"><img src={ASSET('logo/pulseform-mark-white.png')} alt="Pulseform" /></span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [booting, setBooting] = useState(true);
  const [phase, setPhase] = useState('welcome');       // welcome | login | onboarding | app
  const [tab, setTab] = useState('today');             // today | form | plan | you
  const [sheet, setSheet] = useState(false);
  const [checkin, setCheckin] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const symptoms = checkin ? checkin.symptoms : 86;
  const runReady = checkin ? checkin.runReady : 62;

  // Boot: identify the session and route accordingly.
  useEffect(() => { (async () => {
    const r = await api('/me');
    if (r.ok && r.data.user) {
      setUser(r.data.user);
      const p = r.data.profile;
      if (p) setProfile(fromApiProfile(p));
      if (p && p.onboarded) {
        setPhase('app');
        const c = await api('/checkins');
        if (c.ok && c.data.checkin) setCheckin(fromApiCheckin(c.data.checkin));
      } else {
        setPhase('onboarding');
      }
    } else {
      setPhase('welcome');
    }
    setBooting(false);
  })(); }, []);

  // register the service worker (push notifications)
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);

  // reset scroll-to-top feel when switching tabs
  useEffect(() => { const el = document.querySelector('.pf-scroll'); if (el) el.scrollTop = 0; }, [tab, phase]);

  const enterApp = async () => {
    setTab('today'); setPhase('app');
    const c = await api('/checkins');
    if (c.ok && c.data.checkin) setCheckin(fromApiCheckin(c.data.checkin));
  };

  const doLogin = async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (!r.ok) return { ok: false, error: r.data.error || 'Could not log in.' };
    const me = await api('/me');
    if (me.ok && me.data.user) {
      setUser(me.data.user);
      const p = me.data.profile;
      if (p) setProfile(fromApiProfile(p));
      if (p && p.onboarded) await enterApp();
      else setPhase('onboarding');
    }
    return { ok: true };
  };

  const finishOnboarding = async (account) => {
    if (account) {
      const s = await api('/auth/signup', { method: 'POST', body: JSON.stringify(account) });
      if (!s.ok) return { ok: false, error: s.data.error || 'Could not create account.' };
      setUser(s.data.user);
    }
    const body = {
      name: profile.name, sex: profile.sex, age: profile.age, height: profile.height,
      weight: profile.weight, restHr: profile.restHr, experience: profile.experience,
      weekly: profile.weekly, goal: profile.goal, injuries: profile.injuries, pain: profile.pain,
    };
    const pr = await api('/profile', { method: 'PUT', body: JSON.stringify(body) });
    if (!pr.ok) return { ok: false, error: pr.data.error || 'Could not save your profile.' };
    await enterApp();
    return { ok: true };
  };

  const saveCheckin = async (c) => {
    const sym = computeSymptoms(c);
    const rr = clamp(62 + Math.round((sym - 86) * 0.45), 0, 100);
    const full = { ...c, symptoms: sym, runReady: rr };
    setCheckin(full); setSheet(false);
    api('/checkins', { method: 'POST', body: JSON.stringify(full) }); // persist optimistically
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null); setProfile(DEFAULT_PROFILE); setCheckin(null);
    setTab('today'); setPhase('welcome');
  };

  let screen;
  if (booting) screen = <Splash />;
  else if (phase === 'welcome') screen = <Welcome onStart={() => setPhase('onboarding')} onLogin={() => setPhase('login')} />;
  else if (phase === 'login') screen = <Login onLogin={doLogin} onBack={() => setPhase('welcome')} onCreate={() => setPhase('onboarding')} />;
  else if (phase === 'onboarding') screen = <Onboarding profile={profile} setProfile={setProfile} authed={!!user} onFinish={finishOnboarding} onExit={() => (user ? logout() : setPhase('welcome'))} />;
  else {
    const tabs = {
      today: <Today profile={profile} checkin={checkin} runReady={runReady} symptoms={symptoms}
        goForm={() => setTab('form')} goCardio={() => setTab('today')} openCheckin={() => setSheet(true)} />,
      form: <Form goPlan={() => setTab('plan')} />,
      plan: <Plan runReady={runReady} onStart={() => setSheet('started')} />,
      you: <You profile={profile} user={user} onLogout={logout} />,
    };
    screen = (
      <>
        {tabs[tab]}
        <TabBar active={tab} onChange={setTab} />
      </>
    );
  }

  return (
    <div className="device">
      <div className="device__island" />
      <div className="device__screen">
        {screen}
        {sheet === true && (
          <CheckInSheet initial={checkin} onClose={() => setSheet(false)} onSave={saveCheckin} />
        )}
        {sheet === 'started' && (
          <>
            <div className="pf-sheet-scrim" onClick={() => setSheet(false)} />
            <div className="pf-sheet" style={{ textAlign: 'center' }}>
              <div className="pf-sheet__grab" />
              <div className="pf-pair" style={{ paddingTop: 8 }}>
                <span className="pf-sensor-card__ic" style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 14 }}><Icon name="check" size={30} /></span>
                <h3 className="pf-sheet__title">Session ready</h3>
                <p className="pf-sheet__sub">Your adapted easy run + knee-stability circuit is queued. Strap on and start when you’re ready.</p>
              </div>
              <Button size="lg" block onClick={() => setSheet(false)}>Done</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
