import { getRequestBody, createResponse } from "../util/requestUtilities.js";
import regionRoutes from "./regionRoutes.js";
import Repository from "../repository/repository.js";
import municipalityRoutes from "./municipalityRoutes.js";
import townHallRoutes from "./townHallRoutes.js";
import settlementRoutes from "./settlementRoutes.js";

const routes = ({ client }) => ({
  "/statistics:GET": async (request, response) => {
    const queryText = `SELECT (SELECT COUNT(*) FROM naseleno_mqsto) AS countSettlements,(SELECT COUNT(*) FROM kmetstvo) AS countTownHalls,(SELECT COUNT(*) FROM obshtina) AS countMunicipalities,(SELECT COUNT(*) FROM oblast) AS countRegions LIMIT 1;`;

    try {
      const result = await client.query(queryText);
      console.log(result.rows);
      return createResponse(response, 200, "application/json", result.rows[0]);
    } catch (e) {
      console.log(e);
      return createResponse(response, 500, "application/json", {
        error: "Internal Server Error",
      });
    } finally {
      client.release();
    }
  },

  ...regionRoutes(client, new Repository(client, "region")),
  ...municipalityRoutes(client, new Repository(client, "municipality")),
  ...townHallRoutes(client, new Repository(client, "town_hall")),
  ...settlementRoutes(client, new Repository(client, "settlement")),
});

export default routes;
