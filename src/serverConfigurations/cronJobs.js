const fs = require("fs");
const Logger = require("./logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const STATUS_CODES = require("./constants");

async function clearOldFileUploads(pool) {
  let logger;
  try {
    const logger =  new Logger({ dbConnection: new DbConnectionWrapper(await pool.connect()) });
    const client = await pool.connect();
    const oldFileResult = await client.query(
      `SELECT * FROM file_uploads WHERE created_at < NOW() - INTERVAL '1 day'`
    );
    for (const file of oldFileResult.rows) {
      await fs.promises.unlink(file.file_path);
      await client.query(`DELETE FROM file_uploads WHERE id = $1`, [file.id]);
    }
    
    await logger.info({ 
      code: STATUS_CODES.CRON_SUCCESS, 
      short_description: "Cron job for clearing files succeeded", 
      long_description: "Cleared stale file uploads older than 1 day" 
    });
  } catch (error) {
    if(logger){
      await logger.error(error);
    }
  }
}

module.exports = { clearOldFileUploads };
