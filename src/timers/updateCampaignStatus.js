const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const util = require('util');
const { exec } = require("child_process");
const execAsync = util.promisify(exec);

(async () => {
    let client;
    let logger;
    try {
        client = await pool.connect();
        logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

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
            END`
        );

        const campaignResult = await client.query('SELECT campaign_status_update_interval FROM app_settings LIMIT 1');
        const interval = campaignResult.rows[0].campaign_status_update_interval;
        const seconds = interval.minutes * 60;

        await execAsync(`sudo sed -i 's/OnUnitActiveSec=.*/OnUnitActiveSec=${seconds}/' /etc/systemd/system/updateCampaignStatus.timer`);
        await execAsync('sudo systemctl daemon-reload');
        await execAsync('sudo systemctl restart updateCampaignStatus.timer');

        console.log("Campaign status update completed");
    } catch (error) {
        if(logger) await logger.error(error);
    } finally {
        if(client) client.release();
    }
    process.exit();
})();