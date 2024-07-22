import { getRequestBody, createResponse } from "../util/requestUtilities.js";

const settlementRoutes = (client, settlementRepository) => ({
  "/settlements:GET": async (request, response) => {
    const { id, name } = request.params;
    console.log("Received JSON data:", request.params);

    try {
      if (id) {
        const result = await settlementRepository.getByIdAsync(id);

        if (!result) {
          return createResponse(response, 404, "application/json", result);
        }
        return createResponse(response, 200, "application/json", result);
      } else if (name) {
        const result = await settlementRepository.getAllSettlementsByNameAsync(
          name
        );

        if (!result) {
          return createResponse(response, 404, "application/json", result);
        }
        return createResponse(response, 200, "application/json", result);
      }

      const result = await settlementRepository.getAllAsync();
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

  "/settlements:POST": async (request, response) => {
    const body = await getRequestBody(request);

    try {
      const entity = JSON.parse(body);
      const result = await settlementRepository.createAsync(entity);
      return createResponse(response, 201, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "Settlement could not be created",
      });
    } finally {
      client.release();
    }
  },

  "/settlements:PUT": async (request, response) => {
    const { id } = request.params;
    const body = await getRequestBody(request);

    try {
      const entity = JSON.parse(body);
      const result = await settlementRepository.updateAsync(id, entity);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "Settlement not found",
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

  "/settlements:DELETE": async (request, response) => {
    const { id } = request.params;

    try {
      const result = await settlementRepository.deleteAsync(id);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "Settlement not found",
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

export default settlementRoutes;
