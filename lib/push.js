// Web Push configuration. VAPID keys come from env (set on the Vercel project).
const webpush = require('web-push');

let configured = false;
function ensure() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@pulseform.app', pub, priv);
  configured = true;
  return true;
}

module.exports = { webpush, ensure };
