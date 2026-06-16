// Postgres connection for Vercel serverless functions.
// Uses the pooled connection string Vercel Postgres injects (POSTGRES_URL),
// falling back to a generic DATABASE_URL.
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING;
    if (!connectionString) throw new Error('No Postgres connection string set (DATABASE_URL / POSTGRES_URL).');
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1, // serverless: keep it tiny
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
};
