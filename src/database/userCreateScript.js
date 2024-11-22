const { faker } = require("@faker-js/faker");
const pool = require("./dbConfig");

let randomCounter = 0;

function generateUsers(count) {
  const users = [];

  for (let i = 0; i < count; i++) {
    users.push({
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      email: `${randomCounter++}${faker.internet.email()}`,
      phone: faker.phone.number({ style: 'national' }),
      birth_date: faker.date.past({ years: 80 }),
      iso_country_code_id: faker.commerce.price({ min: 1, max: 104, dec: 0 }),
      country_id: faker.commerce.price({ min: 1, max: 104, dec: 0 }),
      gender_id: faker.commerce.price({ min: 1, max: 2, dec: 0 }),
      password_hash: '$2b$10$VWgjT8LEqFkGeuYyQ7Uk/ujryKWfAfTrLDtrbAwJNINZP8gmniUfO',
    });
  }

  return users;
}

async function saveUsers(recordCount, batchSize = 3000) {
  const client = await pool.connect();

  try {
    for (let offset = 0; offset < recordCount; offset += batchSize) {
      await client.query("BEGIN");

      const currentBatchSize = Math.min(batchSize, recordCount - offset);
      const users = generateUsers(currentBatchSize);
      const values = [];
      const params = [];
      let paramIndex = 1;


      for (const user of users) {
        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );

        params.push(
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
        );
      }

      const query = `
        INSERT INTO users (first_name, last_name, email, phone, birth_date, iso_country_code_id, country_id, gender_id, is_email_verified, password_hash)
        VALUES ${values.join(", ")}`;

      await client.query(query, params);
      await client.query("COMMIT");

      console.log(
          `Inserted batch ${
              Math.floor(offset / batchSize) + 1
            } with ${currentBatchSize} users`
        );
    }
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
  } finally {
    client.release();
  }
}

const numUsers = 1;
saveUsers(numUsers).catch(console.error);
