const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const e = require("express");

(async () => {
    let client;
    let logger;
    const materializedViews = [
        "daily_order_summary",
        "monthly_order_summary",
    ]

    while (true) {
        try {
            const now = new Date();
            const nextMidnight = new Date(now);
            nextMidnight.setHours(24, 0, 0, 0);
            const timeUntilMidnight = nextMidnight - now;

            // Wait until midnight
            console.log(`Next materialized view refresh scheduled at: ${nextMidnight.toISOString()}`);
            await new Promise(resolve => setTimeout(resolve, timeUntilMidnight));

            client = await pool.connect();
            logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

            console.log("Starting materialized view refresh...");
            await logger.info({
                code: "TIMERS.DASHBOARD_MAT_VIEWS.00001.REFRESH_STARTED",
                short_description: "Starting materialized view refresh",
                long_description: "Materialized view refresh process started at midnight"
            });

            for (const viewName of materializedViews) {
                try {
                    await client.query('BEGIN');
                    await client.query(`REFRESH MATERIALIZED VIEW ${viewName}`);
                    await client.query('COMMIT');

                    await logger.info({
                        code: "TIMERS.DASHBOARD_MAT_VIEWS.00002.VIEW_REFRESHED",
                        short_description: `Refreshed materialized view: ${viewName}`,
                        long_description: `Successfully refreshed materialized view ${viewName}`
                    });
                } catch (error) {
                    console.error(`Error refreshing materialized view ${viewName}:`, error);
                    await client.query('ROLLBACK');

                    error.params = {
                        code: "TIMERS.DASHBOARD_MAT_VIEWS.00003.VIEW_REFRESH_ERROR",
                    }
                    await logger.error(error);
                }
            }

            console.log("Materialized view refresh completed");
            await logger.info({
                code: "TIMERS.MAT_VIEWS.00006.REFRESH_COMPLETED",
                short_description: "Materialized view refresh completed",
                long_description: `Successfully refreshed ${materializedViews.length} materialized views`
            });
        } catch (error) {
            console.error("Error during materialized view refresh:", error);
            if (logger) await logger.error(error);
        } finally {
            if (client) client.release();
        }
    }
})();