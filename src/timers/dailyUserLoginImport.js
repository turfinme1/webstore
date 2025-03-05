const { faker } = require("@faker-js/faker");
const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");

const TOTAL_USERS_PER_DAY = 5000;
const BATCH_SIZE = 300;
const BATCHES_PER_DAY = Math.ceil(TOTAL_USERS_PER_DAY / BATCH_SIZE);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_BATCH = Math.floor(MS_PER_DAY / BATCHES_PER_DAY);

async function getRandomUsers(client, count) {
    const result = await client.query(`
        SELECT id, email
        FROM users
        WHERE is_active = TRUE
        ORDER BY RANDOM()
        LIMIT $1`,
        [count]
    );
    return result.rows;
}

async function generateUserLogins(count, client) {
    const users = await getRandomUsers(client, count);
    const userLogins = [];

    for (const user of users) {
        const loginCount = faker.number.int({ min: 1, max: 4 });
        const userLogin = Array.from({ length: loginCount }, () => ({
            user_id: user.id,
            status_code: "CONTROLLER.AUTH.00051.LOGIN_SUCCESS",
            log_level: "INFO",
            short_description: "Login successful",
            long_description: `User ${user.email} logged in successfully`,
            created_at: faker.date.past({ years: 1 }),
            audit_type: "INFO"
        }));
        userLogins.push(...userLogin);
    }

    return userLogins;
}

async function insertBatch(elements, client, logger) {
  const values = elements.map((_, index) => {
    const offset = index * 7;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
  }).join(', ');

  const params = elements.flatMap(element => [
    element.user_id,
    element.status_code,
    element.log_level,
    element.short_description,
    element.long_description,
    element.created_at,
    element.audit_type,
  ]);

  await client.query(`
    INSERT INTO logs (
        user_id, 
        status_code,  
        log_level,
        short_description,
        long_description, 
        created_at, 
        audit_type
    ) VALUES ${values}`, params
  );
}

(async () => {
    while (true) {
      let client;
      let logger;
  
      try {
        const now = new Date();
        const startOfDay = new Date((new Date()).setHours(0,0,0,0));
        const batchesRemaining = BATCHES_PER_DAY - Math.floor((now - startOfDay) / MS_PER_BATCH);
  
        if (batchesRemaining <= 0) {
          const tomorrow = new Date(startOfDay);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const msUntilTomorrow = tomorrow - now;
          await new Promise(resolve => setTimeout(resolve, msUntilTomorrow));
          continue;
        }
  
        for (let i = 0; i < batchesRemaining; i++) {
          const batchStart = Date.now();
  
          try {
            client = await pool.connect();
            logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

            await client.query('BEGIN');
            const elements = await generateUserLogins(BATCH_SIZE, client);
            await insertBatch(elements, client, logger);
            await client.query('COMMIT');
            
            console.log(`Completed batch ${BATCHES_PER_DAY - batchesRemaining + i + 1}/${BATCHES_PER_DAY}`);
          } catch (error) {
            await client.query('ROLLBACK');
            await logger.error({
              code: 'CRON_USER_LOGIN_GENERATION_BATCH_ERROR',
              short_description: `Failed to generate user login batch`,
              long_description: error.message,
              debug_info: error.stack
            });
          } finally {
            client.release();
            randomCounter = 0;
          }
  
          // Wait for next batch interval
          const processingTime = Date.now() - batchStart;
          const waitTime = Math.max(0, MS_PER_BATCH - processingTime);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
       
        await logger.info({
            code: 'TIMERS.DAILY_USER_LOGIN_IMPORT.00107.USER_LOGIN_IMPORT_SUCCESS',
            short_description: `Generated ${TOTAL_USERS_PER_DAY} user login logs`,
            long_description: `Successfully inserted ${TOTAL_USERS_PER_DAY} user login logs`
        });
      } catch (error) {
        console.error("Error in user logins generation process:", error);
        if (logger) await logger.error(error);
        await new Promise(resolve => setTimeout(resolve, 60000));
      } finally {
        if (client) client.release();
      }
    }
})();