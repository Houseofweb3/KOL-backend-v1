// Temporary helper: list all databases on the RDS instance (read-only)
const fs = require("fs");
const { Client } = require("pg");

// minimal .env parser
const env = {};
for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const client = new Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 5432),
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: "postgres", // connect to default maintenance DB
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  const res = await client.query(`
    SELECT d.datname AS name,
           pg_size_pretty(pg_database_size(d.datname)) AS size,
           pg_get_userbyid(d.datdba) AS owner,
           (SELECT count(*) FROM pg_stat_activity a WHERE a.datname = d.datname) AS connections
    FROM pg_database d
    WHERE d.datistemplate = false
    ORDER BY pg_database_size(d.datname) DESC;
  `);
  console.table(res.rows);
  await client.end();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
