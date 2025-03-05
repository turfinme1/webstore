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

            const data = await client.query(`
                WITH campaign_status AS (
                    SELECT 
                        c.id,
                        c.status AS old_status,
                        c.target_group_id,
                        CASE
                            WHEN v.is_active = FALSE THEN 'Inactive'
                            WHEN NOW() > v.end_date THEN 'Expired voucher'
                            WHEN NOW() < c.start_date THEN 'Pending'
                            WHEN NOW() BETWEEN c.start_date AND c.end_date THEN 'Active'
                            ELSE 'Inactive'
                        END AS new_status
                    FROM campaigns c
                    JOIN vouchers v ON c.voucher_id = v.id
                    WHERE c.status != CASE
                        WHEN v.is_active = FALSE THEN 'Inactive'
                        WHEN NOW() > v.end_date THEN 'Expired voucher'
                        WHEN NOW() < c.start_date THEN 'Pending'
                        WHEN NOW() BETWEEN c.start_date AND c.end_date THEN 'Active'
                        ELSE 'Inactive'
                    END
                ),
                user_counts AS (
                    SELECT 
                        tg.id AS target_group_id,
                        COUNT(DISTINCT utg.user_id) AS user_count
                    FROM target_groups tg
                    LEFT JOIN user_target_groups utg ON tg.id = utg.target_group_id
                    GROUP BY tg.id
                )
                UPDATE campaigns c
                SET 
                    status = cs.new_status,
                    final_user_count = CASE
                        WHEN (cs.new_status IN ('Inactive', 'Expired voucher')) 
                            AND (cs.old_status NOT IN ('Inactive', 'Expired voucher'))
                            AND c.final_user_count IS NULL
                        THEN uc.user_count
                        ELSE c.final_user_count
                    END
                FROM campaign_status cs
                LEFT JOIN user_counts uc ON cs.target_group_id = uc.target_group_id
                WHERE c.id = cs.id
                RETURNING c.id, c.status, c.final_user_count
            `);

            console.log("Campaign status update completed");
            await logger.info({ 
                code: `TIMERS.UPD_CAMPAIGN_STATUS.00042.CRON_UPDATE_SUCCESS`,
                short_description: "Campaign status update completed by cron",
                long_description: "Campaign status update completed by cron"
            });
        } catch (error) {
            if (logger) await logger.error(error);
            console.error("Error during campaign update:", error);
        } finally {
            if (client) client.release();
        }
    }
})();