const Pool = require("pg").Pool;
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "webstore",
  password: "postgres",
  port: "5432",
  max: 10,
  idleTimeoutMillis: 6000,
});

module.exports = pool;
