const { json } = require('../../lib/http');

// Public key the browser needs to create a push subscription.
module.exports = async (req, res) => json(res, 200, { publicKey: process.env.VAPID_PUBLIC_KEY || null });
