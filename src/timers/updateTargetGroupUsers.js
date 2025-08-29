const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const { loadEntitySchemas } = require("../schemas/entitySchemaCollection");
const CrudService = require("../services/crudService");

(async () => {
    let client;
    let logger;

    while (true) {
        try {
            console.log("Starting updateTargetGroupUsers");
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
            
            await new Promise(resolve => setTimeout(resolve, milliseconds));

            const entitySchemaCollection = loadEntitySchemas("admin");
            const crudService = new CrudService();
            console.log('[updateTargetGroupUsers] Aquire client from pool...');
            client = await pool.connect();
            logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

            const targetGroupsResult = await client.query(`
                SELECT DISTINCT tg.* 
                FROM target_groups tg
                JOIN campaigns c ON tg.id = c.target_group_id
                WHERE c.status = 'Active'`
            );
            const targetGroups = targetGroupsResult.rows;

            for (const targetGroup of targetGroups) {
                try {
                    await client.query('BEGIN');
                    const data = {
                        params: { entity: "users" },
                        query: targetGroup.filters.query,
                        dbConnection: client,
                        entitySchemaCollection
                    };

                    const innerQuery = crudService.buildFilteredPaginatedQuery(data);

                    await client.query(`
                        DELETE FROM user_target_groups
                        WHERE target_group_id = $${innerQuery.searchValues.length + 1}
                        AND user_id NOT IN (
                            SELECT users_view.id 
                            FROM (${innerQuery.query}) AS users_view)`,
                        [...innerQuery.searchValues, targetGroup.id]
                    );

                    await client.query(`
                        INSERT INTO user_target_groups (user_id, target_group_id)
                        SELECT users_view.id, $${innerQuery.searchValues.length + 1}
                        FROM (${innerQuery.query}) AS users_view
                        ON CONFLICT (user_id, target_group_id) DO NOTHING`,
                        [...innerQuery.searchValues, targetGroup.id]
                    );

                    await client.query(`
                        UPDATE target_groups 
                        SET updated_at = NOW() 
                        WHERE id = $1`, 
                        [targetGroup.id]
                    );

                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                }
            }

            console.log("Target groups update completed");
            await logger.info({ 
                code: `TIMERS.UPD_TARGET_GROUP.00091.CRON_UPDATE_SUCCESS`,
                short_description: "Target groups update completed by cron",
                long_description: "Target groups update completed by cron"
            });
        } catch (error) {
            console.error("Error during target groups update:", error);
            if (logger) await logger.error(error);
        } finally {
            if (client) {
                console.log('[updateTargetGroupUsers] Release client to pool');
                client.release();
            }
        }
    }
})();