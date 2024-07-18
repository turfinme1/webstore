import oblasti from "../data/ek_oblast.json" with {type:"json"};
import obshtini from "../data/ek_obshtina.json" with {type:"json"};
import kmetstva from "../data/ek_kmetstvo.json" with {type:"json"};
import naseleniMesta from "../data/ek_naseleno.json" with {type:"json"};

const seedDatabase = async () => {
  await config.connect();
  const client = await config.connect();
  await seedOblasti(client);
  await seedObshtini(client);
  await seedKmetstva(client);
  await seedNaselenoMqsto(client);
};

const seedOblasti = async (client) => {
  const dataset = oblasti.map((ob) => {
    return [ob.oblast, ob.name_en, ob.name];
  });
  console.log(dataset);

  const queryString =
    "INSERT INTO oblast(oblast_code, name_en, name) VALUES($1, $2, $3) RETURNING *";
  for (const values of dataset) {
    const res = await client.query(queryString, values);
    console.log(res.rows[0]);
  }
};

const seedObshtini = async (client) => {
  const dataset = await Promise.all(
    obshtini.map(async (ob) => {
      const oblastCode = ob.obshtina.substring(0, 3);
      const queryString = "SELECT id FROM oblast WHERE oblast_code = $1";
      const res = await client.query(queryString, [oblastCode]);

      const oblastId = res.rows[0].id;
      return [ob.obshtina, ob.name_en, ob.name, oblastId];
    })
  );
  console.log(dataset);

  const queryString =
    "INSERT INTO obshtina(obshtina_code, name_en, name, oblast_id) VALUES($1, $2, $3, $4) RETURNING *";
  for (const values of dataset) {
    const res = await client.query(queryString, values);
    console.log(res.rows[0]);
  }
};

const seedKmetstva = async (client) => {
  const dataset = await Promise.all(
    kmetstva.map(async (km) => {
      const obshtinaCode = km.kmetstvo.substring(0, 5);
      const queryString = "SELECT id FROM obshtina WHERE obshtina_code = $1";
      const res = await client.query(queryString, [obshtinaCode]);
      const obshtinaId = res.rows[0].id;
      return [km.kmetstvo, km.name_en, km.name, obshtinaId];
    })
  );
  console.log(dataset);

  const queryString =
    "INSERT INTO kmetstvo(kmetstvo_code, name_en, name, obshtina_id) VALUES($1, $2, $3, $4) RETURNING *";
  for (const values of dataset) {
    const res = await client.query(queryString, values);
    console.log(res.rows[0]);
  }
};

const seedNaselenoMqsto = async (client) => {
  let dataset = await Promise.all(
    naseleniMesta.map(async (nm) => {
      const kmetstvoCode = nm.kmetstvo;
      const queryString = "SELECT id FROM kmetstvo WHERE kmetstvo_code = $1";
      const res = await client.query(queryString, [kmetstvoCode]);
      if (res.rows[0]) {
        const kmetstvoId = res.rows[0].id;
        return [nm.ekatte, nm.name_en, nm.name, kmetstvoId];
      }
      return [nm.ekatte, nm.name_en, nm.name, null];
    })
  );
  console.log(dataset);
  const queryString =
    "INSERT INTO naseleno_mqsto(ekatte, name_en, name, kmetstvo_id) VALUES($1, $2, $3, $4) RETURNING *";
  for (const values of dataset) {
    const res = await client.query(queryString, values);
    console.log(res.rows[0]);
  }
};

export default seedDatabase;