import config from "./dbConfig.js";
import pg from "pg";
const { Pool } = pg;

import oblasti from "../data/ek_oblast.json" with {type:"json"};
import obshtini from "../data/ek_obshtina.json" with {type:"json"};
import kmetstva from "../data/ek_kmetstvo.json" with {type:"json"};
import naseleniMesta from "../data/ek_naseleno.json" with {type:"json"};

const pool = new Pool(config);

const seedDatabase = async (client) => {
  await seedOblasti(client);
  await seedObshtini(client);
  await seedKmetstva(client);
  await seedNaselenoMqsto(client);
  client.release();
};

const seedOblasti = async (client) => {
  const queryString =
    "INSERT INTO oblast(oblast_code, name_en, name) VALUES($1, $2, $3) ON CONFLICT (oblast_code) DO NOTHING RETURNING *";

  oblasti.map(async (ob) => {
    let params = [ob.oblast, ob.name_en, ob.name];
    let res = await client.query(queryString, params);
    console.log(res.rows[0]);
  });
};

const seedObshtini = async (client) => {
  const queryString =
    "INSERT INTO obshtina(obshtina_code, name_en, name, oblast_id) VALUES($1, $2, $3, (SELECT id FROM oblast WHERE oblast_code = $4 LIMIT 1)) ON CONFLICT (obshtina_code) DO NOTHING RETURNING *";

  obshtini.map(async (ob) => {
    let oblastCode = ob.obshtina.substring(0, 3);
    let params = [ob.obshtina, ob.name_en, ob.name, oblastCode];
    let res = await client.query(queryString, params);
    console.log(res.rows[0]);
  });
};

const seedKmetstva = async (client) => {
  const queryString =
    "INSERT INTO kmetstvo(kmetstvo_code, name_en, name, obshtina_id) VALUES($1, $2, $3, (SELECT id FROM obshtina WHERE obshtina_code = $4 LIMIT 1)) ON CONFLICT (kmetstvo_code) DO NOTHING RETURNING *";

  kmetstva.map(async (km) => {
    let obshtinaCode = km.kmetstvo.substring(0, 5);
    let params = [km.kmetstvo, km.name_en, km.name, obshtinaCode];
    let res = await client.query(queryString, params);
    console.log(res.rows[0]);
  });
};

const seedNaselenoMqsto = async (client) => {
  const queryString =
    "INSERT INTO naseleno_mqsto(ekatte, name_en, name, kmetstvo_id) VALUES($1, $2, $3, (SELECT COALESCE((SELECT id FROM kmetstvo WHERE kmetstvo_code = $4 LIMIT 1), NULL))) ON CONFLICT (ekatte) DO NOTHING RETURNING *";

  naseleniMesta.map(async (nm) => {
    let params = [nm.ekatte, nm.name_en, nm.name, nm.kmetstvo];
    let res = await client.query(queryString, params);
    console.log(res.rows[0]);
  });
};

await seedDatabase(await pool.connect());
export default seedDatabase;
