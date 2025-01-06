const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");

(async () => {
    let client;
    let logger;

    while (true) {
        try {
            const campaignResult = await pool.query('SELECT campaign_status_update_interval FROM app_settings LIMIT 1');
            const interval = campaignResult.rows[0]?.campaign_status_update_interval;
            const milliseconds = interval.minutes * 60 * 1000;

            await new Promise(resolve => setTimeout(resolve, milliseconds));
            client = await pool.connect();
            logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

            // Update campaign statuses
            await client.query(`
                UPDATE campaigns c
                SET status = CASE
                    WHEN v.is_active = FALSE THEN 'Inactive'
                    WHEN NOW() > v.end_date THEN 'Expired voucher'
                    WHEN NOW() < c.start_date THEN 'Pending'
                    WHEN NOW() BETWEEN c.start_date AND c.end_date THEN 'Active'
                    ELSE 'Inactive'
                END
                FROM vouchers v
                WHERE c.voucher_id = v.id
                AND c.status != CASE
                    WHEN v.is_active = FALSE THEN 'Inactive'
                    WHEN NOW() > v.end_date THEN 'Expired voucher'
                    WHEN NOW() < c.start_date THEN 'Pending'
                    WHEN NOW() BETWEEN c.start_date AND c.end_date THEN 'Active'
                    ELSE 'Inactive'
                END
            `);

            console.log("Campaign status update completed");
        } catch (error) {
            if (logger) await logger.error(error);
            console.error("Error during campaign update:", error);
        } finally {
            if (client) client.release();
        }
    }
})();