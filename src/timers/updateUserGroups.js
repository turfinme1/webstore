const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const { loadEntitySchemas } = require("../schemas/entitySchemaCollection");
const CrudService = require("../services/crudService");
const ReportService = require("../services/reportService");
const { tr } = require("@faker-js/faker");

(async () => {
    let client;
    let logger;

    while (true) {
        try {
            const settingsResult = await pool.query(`
                SELECT 
                    target_group_status_update_interval as interval,
                    target_group_status_update_initial_time as initial_time
                FROM app_settings LIMIT 1
            `);
            
            const { interval, initial_time } = settingsResult.rows[0];
            const milliseconds = interval.minutes * 60 * 1000;
            const now = new Date();
            const initialTimeToday = new Date(now);
            initialTimeToday.setHours(initial_time.split(":")[0]);
            initialTimeToday.setMinutes(initial_time.split(":")[1]);

            if (now < initialTimeToday) {
                await new Promise(resolve => setTimeout(resolve, milliseconds));
                continue;
            }
            
            // await new Promise(resolve => setTimeout(resolve, milliseconds));

            const entitySchemaCollection = loadEntitySchemas("admin");
            const reportService = new ReportService();
            client = await pool.connect();
            logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

            const userGroupsResult = await client.query(`
                SELECT * 
                FROM user_groups
                WHERE user_groups.is_active = TRUE`
            );
            const userGroups = userGroupsResult.rows;

            for (const userGroup of userGroups) {
                try {
                    await client.query('BEGIN');
                    const data = {
                        params: { report: 'report-users' },
                        dbConnection: client,
                        entitySchemaCollection,
                        body: {
                            metadataRequest: true,
                        }
                    };

                    const reportDefinition = await reportService.getReport(data)
                    const replacedQueryData = reportService.replaceFilterExpressions(reportDefinition.sql, reportDefinition.reportFilters, userGroup.filters);
    
                    await client.query(`
                        DELETE FROM user_user_groups
                        WHERE user_group_id = $${replacedQueryData.insertValues.length + 1}
                        AND user_id NOT IN (
                            SELECT users_view.id 
                            FROM (${replacedQueryData.sql}) AS users_view
                            WHERE users_view.id IS NOT NULL
                        )`,
                        [...replacedQueryData.insertValues, userGroup.id]
                    );

                    await client.query(`
                        INSERT INTO user_user_groups (user_id, user_group_id)
                        SELECT users_view.id, $${replacedQueryData.insertValues.length + 1}
                        FROM (${replacedQueryData.sql}) AS users_view
                        WHERE users_view.id IS NOT NULL
                        ON CONFLICT (user_id, user_group_id) DO NOTHING`,
                        [...replacedQueryData.insertValues, userGroup.id]
                    );

                    await client.query(`
                        UPDATE user_groups 
                        SET updated_at = NOW() 
                        WHERE id = $1`, 
                        [userGroup.id]
                    );

                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                }
            }

            console.log("User group update completed");
            await logger.info({ 
                code: `TIMERS.UPD_USER_GROUP.00091.CRON_UPDATE_SUCCESS`,
                short_description: "User group update completed by cron",
                long_description: "User group update completed by cron"
            });
        } catch (error) {
            if (logger) await logger.error(error);
            console.error("Error during User group update:", error);
        } finally {
            if (client) client.release();
        }
    }
})();