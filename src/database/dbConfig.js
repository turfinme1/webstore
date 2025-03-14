const { ENV } = require("../serverConfigurations/constants");
const Pool = require("pg").Pool;

const pool = new Pool({
  user: ENV.DB_USER,
  host: ENV.DB_HOST,
  database: ENV.DB_DATABASE,
  password: ENV.DB_PASSWORD,
  port: ENV.DB_PORT,
  max: ENV.DB_MAX,
  idleTimeoutMillis: 6000,
});

module.exports = pool;
