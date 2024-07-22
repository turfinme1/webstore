import { getRequestBody, createResponse } from "../util/requestUtilities.js";

const routes = ({ client }) => ({
  "/settlements:POST": async (request, response) => {
    const queryText =
      "INSERT INTO oblast(oblast_code, name_en, name) VALUES($1, $2, $3) RETURNING *";
    const body = await getRequestBody(request);
    const parsedData = await JSON.parse(body);
    const params = [parsedData.oblastCode, parsedData.nameEn, parsedData.name];
    console.log("Received JSON data:", parsedData);

    try {
      const result = await client.query(queryText, params);
      console.log(result.rows);

      return createResponse(response, 201, "application/json", result.rows);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "Region could not be created",
      });
    } finally {
      client.release();
    }
  },

  "/settlements:GET": async (request, response) => {
    const queryText = `SELECT nm.ekatte,nm.name as "naseleno",COALESCE (km.name, 'not found') as "kmetstvo",COALESCE (ob.name, 'not found') as "obshtina",COALESCE(obl.name, 'not found') as "oblast" FROM public.naseleno_mqsto nm LEFT JOIN public.kmetstvo km ON km.id = nm.kmetstvo_id LEFT JOIN public.obshtina ob ON ob.id = km.obshtina_id LEFT JOIN public.oblast obl ON obl.id = ob.oblast_id WHERE LOWER(nm.name) = LOWER($1)`;
    const body = await getRequestBody(request);
    const requestData = request.params;
    try {
      console.log("Received JSON data:", requestData);

      const result = await client.query(queryText, [requestData.name]);
      console.log(result.rows);

      return createResponse(response, 200, "application/json", result.rows);
    } catch (e) {
      console.log(e);
      return createResponse(response, 500, "application/json", {
        error: "Internal Server Error",
      });
    } finally {
      client.release();
    }
  },

  "/settlements:DELETE": async (request, response) => {
    const queryText = "DELETE FROM oblast WHERE id = $1 RETURNING *";
    const requestParams = request.params;
    console.log("requestParams", requestParams);
    const params = [requestParams.id];

    try {
      const result = await client.query(queryText, params);
      console.log(result.rows);

      return createResponse(response, 200, "application/json", result.rows);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "Region could not be deleted",
      });
    } finally {
      client.release();
    }
  },

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
});

export default routes;
