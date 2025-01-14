const fs = require("fs");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const pool = require("../database/dbConfig");

const Logger = require("../serverConfigurations/logger");

(async () => {
    let client;
    let logger;
    try {
        client = await pool.connect();
        logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

        const oldFileResult = await client.query(
            `SELECT * FROM file_uploads WHERE created_at < NOW() - INTERVAL '1 day'`
        );
        for (const file of oldFileResult.rows) {
            await fs.promises.unlink(file.file_path);
            await client.query(`DELETE FROM file_uploads WHERE id = $1`, [file.id]);
        }
        
        await logger.info({ 
            code: 'TIMERS.CLEAR_OLD_FILE_UPLOADS.00023.DELETE_SUCCESS',
            short_description: "Cron job for clearing files succeeded", 
            long_description: "Cleared stale file uploads older than 1 day" 
        });
        console.log("Cron job for clearing files succeeded");
    } catch (error) {
        if(logger){
            await logger.error(error);
        }
        if(client){
            client.release();
        }
    }
})();