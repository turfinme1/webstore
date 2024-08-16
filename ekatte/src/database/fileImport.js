import regions from "../data/ek_oblast.json" with {type:"json"};
import municipalities from "../data/ek_obshtina.json" with {type:"json"};
import townHalls from "../data/ek_kmetstvo.json" with {type:"json"};
import settlements from "../data/ek_naseleno.json" with {type:"json"};
import { from } from "pg-copy-streams";
import { Readable } from "stream";

const fileImport = async (client) => {
  await seedRegions(client);
  await seedMunicipalities(client);
  await seedTownHalls(client);
  await seedSettlements(client);
  client.release();
};

const seedRegions = async (client) => {
  const queryString = `
    INSERT INTO region(region_code, name_en, name) 
    VALUES($1, $2, $3) 
    ON CONFLICT (region_code) DO NOTHING RETURNING *`;

  try {
    await client.query("BEGIN");
    regions.map(async (ob) => {
      let params = [ob.oblast, ob.name_en, ob.name];
      await client.query(queryString, params);
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
  }
};

const seedMunicipalities = async (client) => {
  const queryString = `
    INSERT INTO municipality(municipality_code, name_en, name, region_id) 
    VALUES($1, $2, $3, (SELECT id FROM region WHERE region_code = $4 LIMIT 1)) 
    ON CONFLICT (municipality_code) DO NOTHING RETURNING *`;

  try {
    await client.query("BEGIN");
    municipalities.map(async (ob) => {
      let regionCode = ob.obshtina.substring(0, 3);
      let params = [ob.obshtina, ob.name_en, ob.name, regionCode];
      let res = await client.query(queryString, params);
      console.log(res.rows[0]);
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
  }
};

const seedTownHalls = async (client) => {
  const queryString = `
    INSERT INTO town_hall(town_hall_code, name_en, name, municipality_id) 
    VALUES($1, $2, $3, (SELECT id FROM municipality WHERE municipality_code = $4 LIMIT 1)) 
    ON CONFLICT (town_hall_code) DO NOTHING RETURNING *`;

  try {
    await client.query("BEGIN");
    townHalls.map(async (km) => {
      let municipalityCode = km.kmetstvo.substring(0, 5);
      let params = [km.kmetstvo, km.name_en, km.name, municipalityCode];
      let res = await client.query(queryString, params);
      console.log(res.rows[0]);
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
  }
};

const seedSettlements = async (client) => {
  const insertSettlementQuery = `
    INSERT INTO settlement (ekatte, name_en, name, town_hall_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (ekatte) DO NOTHING
    RETURNING *
  `;
  const insertTownHallQuery = `
    INSERT INTO town_hall (town_hall_code, name_en, name, municipality_id)
    VALUES ($1, $2, $3, (SELECT id FROM municipality WHERE municipality_code = $4 LIMIT 1))
    ON CONFLICT (town_hall_code) DO NOTHING
    RETURNING id`;

  try {
    await client.query("BEGIN");

    for (const nm of settlements) {
      let townHallResult = await client.query(
        "SELECT id FROM town_hall WHERE town_hall_code = $1",
        [nm.kmetstvo]
      );

      let townHallId;

      if (townHallResult.rows.length === 0) {
        const createTownHallResult = await client.query(insertTownHallQuery, [
          nm.kmetstvo,
          nm.name_en,
          nm.name,
          nm.obshtina,
        ]);

        townHallId = createTownHallResult.rows[0]?.id;
      } else {
        townHallId = townHallResult.rows[0].id;
      }

      const settlementParams = [nm.ekatte, nm.name_en, nm.name, townHallId];
      const res = await client.query(insertSettlementQuery, settlementParams);
      console.log(res.rows[0]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
  }
};

const seedSettlementsWithCopy = async (client) => {
  const map = await precomputeSettlementIds(client, settlements);
  const copyFromQuery =
    "COPY settlement (ekatte, name_en, name, town_hall_id) FROM STDIN WITH CSV NULL 'null'";

  try {
    const dataStream = new Readable({
      read() {
        settlements.forEach((nm) => {
          const csvLine = `${nm.ekatte},${nm.name_en},${nm.name},${map.get(
            nm.kmetstvo
          )}\n`;
          this.push(csvLine);
        });
        this.push(null);
      },
    });

    const stream = client.query(from(copyFromQuery));
    dataStream.pipe(stream);

    stream.on("finish", () => {
      console.log("Data inserted successfully");
    });

    stream.on("error", (err) => {
      console.error("Error during COPY operation:", err);
    });
  } catch (err) {
    console.error("Error during database operation:", err);
  }
};

const precomputeSettlementIds = async (client, settlements) => {
  let map = new Map();
  const kmetstvoIdSubquery = `(SELECT COALESCE((SELECT id FROM town_hall WHERE town_hall_code = $1 LIMIT 1), NULL))`;

  for (let nm of settlements) {
    if (!map.get(nm.kmetstvo)) {
      const res = await client.query(kmetstvoIdSubquery, [nm.kmetstvo]);
      map.set(nm.kmetstvo, res.rows[0].coalesce);
    }
  }

  return map;
};

export default fileImport;
