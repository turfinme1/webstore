import { getRequestBody, createResponse } from "../util/requestUtilities.js";

const townHallRoutes = (client, townHallRepository) => ({
  "/townhalls:GET": async (request, response) => {
    const { id } = request.params;
    console.log("Received JSON data:", request.params);

    try {
      if (id) {
        const result = await townHallRepository.getByIdAsync(id);

        if (!result) {
          return createResponse(response, 404, "application/json", result);
        }
        return createResponse(response, 200, "application/json", result);
      }

      const result = await townHallRepository.getAllAsync();
      return createResponse(response, 200, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 500, "application/json", {
        error: "Internal Server Error",
      });
    } finally {
      client.release();
    }
  },

  "/townhalls:POST": async (request, response) => {
    const body = await getRequestBody(request);

    try {
      const entity = JSON.parse(body);
      const result = await townHallRepository.createAsync(entity);
      return createResponse(response, 201, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "TownHall could not be created",
      });
    } finally {
      client.release();
    }
  },

  "/townhalls:PUT": async (request, response) => {
    const { id } = request.params;
    const body = await getRequestBody(request);

    try {
      const entity = JSON.parse(body);
      const result = await townHallRepository.updateAsync(id, entity);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "TownHall not found",
        });
      }
      return createResponse(response, 200, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 500, "application/json", {
        error: "Internal Server Error",
      });
    } finally {
      client.release();
    }
  },

  "/townhalls:DELETE": async (request, response) => {
    const { id } = request.params;

    try {
      const result = await townHallRepository.deleteAsync(id);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "TownHall not found",
        });
      }
      return createResponse(response, 200, "application/json", result);
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

export default townHallRoutes;
