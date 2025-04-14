// userGeneratorCron.js
const { faker } = require("@faker-js/faker");
const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");

const TOTAL_USERS_PER_DAY = 5000;
const BATCH_SIZE = 300;
const BATCHES_PER_DAY = Math.ceil(TOTAL_USERS_PER_DAY / BATCH_SIZE);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_BATCH = Math.floor(MS_PER_DAY / BATCHES_PER_DAY);

let randomCounter = 0;

function generateUsers(count) {
  return Array.from({ length: count }, () => ({
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: `${randomCounter++}${faker.internet.email()}`,
    phone:  faker.phone.number({ style: 'national' }).replace("-", "").split(") ")[1],
    birth_date: faker.date.past({ years: 80 }),
    iso_country_code_id: faker.number.int({ min: 1, max: 104 }),
    country_id: faker.number.int({ min: 1, max: 104 }),
    gender_id: faker.number.int({ min: 1, max: 2 }),
    password_hash: '$2b$10$VWgjT8LEqFkGeuYyQ7Uk/ujryKWfAfTrLDtrbAwJNINZP8gmniUfO'
  }));
}

async function insertUserBatch(users, client, logger) {
  const values = users.map((_, index) => {
    const offset = index * 10;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
  }).join(', ');

  const params = users.flatMap(user => [
    user.first_name,
    user.last_name,
    user.email,
    user.phone,
    user.birth_date,
    user.iso_country_code_id,
    user.country_id,
    user.gender_id,
    true,
    user.password_hash
  ]);

  await client.query(`
    INSERT INTO users (
      first_name, last_name, email, phone, birth_date, 
      iso_country_code_id, country_id, gender_id, 
      is_email_verified, password_hash
    ) VALUES ${values}`, params);
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
            const users = generateUsers(BATCH_SIZE);
            await insertUserBatch(users, client, logger);
            await client.query('COMMIT');
            
            console.log(`Completed batch ${BATCHES_PER_DAY - batchesRemaining + i + 1}/${BATCHES_PER_DAY}`);
          } catch (error) {
            await client.query('ROLLBACK');
            await logger.error({
              code: 'CRON_USER_GENERATION_BATCH_ERROR',
              short_description: `Failed to generate users batch`,
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
            code: 'TIMERS.DAILY_USER_IMPORT.00107.USER_IMPORT_SUCCESS',
            short_description: `Generated ${TOTAL_USERS_PER_DAY} users`,
            long_description: `Successfully inserted ${TOTAL_USERS_PER_DAY} users`
        });
      } catch (error) {
        console.error("Error in user generation process:", error);
        if (logger) await logger.error(error);
        await new Promise(resolve => setTimeout(resolve, 60000));
      } finally {
        if (client) client.release();
      }
    }
})();