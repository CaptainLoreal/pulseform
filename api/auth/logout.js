const { clearSessionCookie } = require('../../lib/auth');
const { json } = require('../../lib/http');

module.exports = async (req, res) => {
  clearSessionCookie(res);
  return json(res, 200, { ok: true });
};
