import pg from "pg";
import http from "http";
import path from "path";
import fs from "fs";
const { Pool } = pg;
const __dirname = import.meta.dirname;
import config from "./database/dbConfig.js";
import fileImport from "./database/fileImport.js";

const PORT = 3000;
const pool = new Pool(config);

// await fileImport(await pool.connect());

const server = http.createServer(async (req, res) => {
  const client = await pool.connect();

  switch (req.url) {
    case "/":
      const filePath = path.join(__dirname, "views", "index.html");
      // console.log(filePath);
      fs.readFile(filePath, "utf-8", (err, data) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      });
      break;
    case "/js/searchScript.js":
      const jsFilePath = path.join(__dirname, "js", "searchScript.js");
      fs.readFile(jsFilePath, "utf-8", (err, data) => {
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.end(data);
      });
      break;

    case "/settlements":
      const body = await getRequestBody(req);

      try {
        const parsedData = await JSON.parse(body);
        console.log("Received JSON data:", parsedData);

        const queryText = `SELECT nm.ekatte,nm.name as "naseleno",COALESCE (km.name, 'not found') as "kmetstvo",COALESCE (ob.name, 'not found') as "obshtina",COALESCE(obl.name, 'not found') as "oblast" FROM public.naseleno_mqsto nm LEFT JOIN public.kmetstvo km ON km.id = nm.kmetstvo_id LEFT JOIN public.obshtina ob ON ob.id = km.obshtina_id LEFT JOIN public.oblast obl ON obl.id = ob.oblast_id WHERE LOWER(nm.name) = LOWER($1)`;
        const result = await client.query(queryText, [parsedData.searchValue]);
        console.log(result.rows);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result.rows));
      } catch (e) {
        console.log(e);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      } finally {
        client.release();
      }
      break;

    case "/css/index.css":
      const cssFilePath = path.join(__dirname, "css", "index.css");
      fs.readFile(cssFilePath, "utf-8", (err, data) => {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(data);
      });
      break;

    case "/statistics":
      const queryText = `SELECT (SELECT COUNT(*) FROM naseleno_mqsto) AS countSettlements,(SELECT COUNT(*) FROM kmetstvo) AS countTownHalls,(SELECT COUNT(*) FROM obshtina) AS countMunicipalities,(SELECT COUNT(*) FROM oblast) AS countRegions LIMIT 1;`;
      const result = await client.query(queryText);
      console.log(result.rows);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result.rows[0]));
      break;
    default:
      break;
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}
