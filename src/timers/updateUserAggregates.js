const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");

(async () => {
    let client;
    let logger;
    
    const aggregatedTables = [
        { 
            name: "user_login_aggregates",
            query: `
                TRUNCATE TABLE user_login_aggregates;

                WITH login_aggregates AS (
                SELECT
                    user_id,
                    MAX(created_at) AS last_login,
                    COUNT(*) AS login_count
                FROM logs
                WHERE status_code = 'CONTROLLER.AUTH.00051.LOGIN_SUCCESS'
                GROUP BY user_id
                )
                INSERT INTO user_login_aggregates (
                    user_id,
                    days_since_last_login,
                    login_count,
                    average_weekly_login_count,
                    updated_at
                )
                SELECT
                    u.id,
                    DATE_PART('day', CURRENT_DATE - la.last_login)::BIGINT AS days_since_last_login,
                    COALESCE(la.login_count, 0) AS login_count,
                    TRUNC(
                        COALESCE(la.login_count, 0)::numeric / GREATEST(1, (DATE_PART('day', CURRENT_DATE - u.created_at) / 7)::numeric),
                        2
                    ) AS average_weekly_login_count,
                    NOW() AS updated_at
                FROM users u
                LEFT JOIN login_aggregates la ON u.id = la.user_id;`
        },
        { 
            name: "user_order_aggregates",
            query: `
                TRUNCATE TABLE user_order_aggregates;

                WITH order_aggregates AS (
                SELECT
                    user_id,
                    MAX(created_at) AS last_order,
                    COUNT(*) AS order_count,
                    SUM(paid_amount) AS order_total_paid_amount,
                    AVG(paid_amount) AS average_paid_amount
                FROM orders
                WHERE status = 'Paid'
                GROUP BY user_id
                ),
                first_orders AS (
                SELECT DISTINCT ON (user_id)
                    user_id,
                    created_at AS first_order_created_at,
                    paid_amount AS first_order_total_paid_amount
                FROM orders
                WHERE status = 'Paid'
                ORDER BY user_id, created_at ASC
                )
                INSERT INTO user_order_aggregates (
                    user_id,
                    has_paid_order,
                    first_order_created_at,
                    days_since_first_order,
                    first_order_total_paid_amount,
                    average_paid_amount,
                    days_since_last_order,
                    order_total_paid_amount,
                    order_count,
                    updated_at
                )
                SELECT 
                    u.id,
                    CASE WHEN oa.order_count IS NULL THEN false ELSE true END AS has_paid_order,
                    fo.first_order_created_at,
                    CASE 
                        WHEN fo.first_order_created_at IS NOT NULL 
                        THEN DATE_PART('day', CURRENT_DATE - fo.first_order_created_at)::BIGINT 
                        ELSE NULL 
                    END AS days_since_first_order,
                    fo.first_order_total_paid_amount,
                    COALESCE(oa.average_paid_amount, 0)::numeric,
                    CASE 
                        WHEN oa.last_order IS NOT NULL 
                        THEN DATE_PART('day', CURRENT_DATE - oa.last_order)::BIGINT 
                        ELSE NULL 
                    END AS days_since_last_order,
                    COALESCE(oa.order_total_paid_amount, 0)::numeric,
                    COALESCE(oa.order_count, 0),
                    NOW() AS updated_at
                FROM users u
                LEFT JOIN order_aggregates oa ON u.id = oa.user_id
                LEFT JOIN first_orders fo ON u.id = fo.user_id;`
        }
    ];

    while (true) {
        try {
            const now = new Date();
            const nextMidnight = new Date(now);
            nextMidnight.setHours(24, 0, 0, 0);
            const timeUntilMidnight = nextMidnight - now;

            // Wait until midnight
            console.log(`Next user aggregates update scheduled at: ${nextMidnight.toISOString()}`);
            await new Promise(resolve => setTimeout(resolve, timeUntilMidnight));

            client = await pool.connect();
            logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

            console.log("Starting user aggregates update...");
            await logger.info({
                code: "TIMERS.USER_AGGREGATES.00001.UPDATE_STARTED",
                short_description: "Starting user aggregates update",
                long_description: "User aggregates update process started at midnight"
            });

            for (const table of aggregatedTables) {
                try {
                    console.log(`Updating aggregated table: ${table.name}`);
                    await client.query('BEGIN');
                    
                    const startTime = Date.now();
                    await client.query(table.query);
                    const duration = ((Date.now() - startTime) / 60000).toFixed(2);
                    await client.query('COMMIT');

                    await logger.info({
                        code: "TIMERS.USER_AGGREGATES.00002.TABLE_UPDATED",
                        short_description: `Updated aggregated table: ${table.name}`,
                        long_description: `Successfully updated ${table.name} in ${duration}ms`
                    });
                } catch (error) {
                    console.error(`Error updating aggregated table ${table.name}:`, error);
                    await client.query('ROLLBACK');

                    error.params = {
                        code: "TIMERS.USER_AGGREGATES.00003.TABLE_UPDATE_ERROR",
                    };
                    await logger.error(error);
                }
            }

            console.log("User aggregates update completed");
            await logger.info({
                code: "TIMERS.USER_AGGREGATES.00004.UPDATE_COMPLETED",
                short_description: "User aggregates update completed",
                long_description: `Successfully updated ${aggregatedTables.length} aggregated tables`
            });
        } catch (error) {
            console.error("Error during user aggregates update:", error);
            if (logger) await logger.error(error);
        } finally {
            if (client) client.release();
        }
    }
})();