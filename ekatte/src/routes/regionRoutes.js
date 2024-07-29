import {
  getRequestBody,
  createResponse,
  mapRequestToEntity,
} from "../util/requestUtilities.js";
import { validateRegionEntity } from "../util/validation.js";

const regionEntity = {
  region_code: "",
  name_en: "",
  name: "",
};

const regionRoutes = (client, regionRepository) => ({
  "/regions:GET": async (request, response) => {
    const { id } = request.params;
    console.log("Received JSON data:", request.params);

    try {
      if (id) {
        const result = await regionRepository.getByIdAsync(id);

        if (!result) {
          return createResponse(response, 404, "application/json", result);
        }
        return createResponse(response, 200, "application/json", result);
      }

      const result = await regionRepository.getAllAsync();
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

  "/regions:POST": async (request, response) => {
    const body = await getRequestBody(request);

    try {
      const requestObject = JSON.parse(body);

      const erors = validateRegionEntity(requestObject);
      if (erors.length > 0) {
        return createResponse(response, 400, "application/json", {
          error: erors,
        });
      }

      const entity = mapRequestToEntity(regionEntity, requestObject);

      const result = await regionRepository.createAsync(entity);
      return createResponse(response, 201, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "Region could not be created",
      });
    } finally {
      client.release();
    }
  },

  "/regions:PUT": async (request, response) => {
    const { id } = request.params;
    const body = await getRequestBody(request);

    try {
      const requestObject = JSON.parse(body);

      const erors = validateRegionEntity(requestObject);
      if (erors.length > 0) {
        return createResponse(response, 400, "application/json", {
          errors: erors,
        });
      }

      const entity = mapRequestToEntity(regionEntity, requestObject);

      const result = await regionRepository.updateAsync(id, entity);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "Region not found",
        });
      }

      return createResponse(response, 200, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "Region could not be updated (duplicate code)",
      });
    } finally {
      client.release();
    }
  },

  "/regions:DELETE": async (request, response) => {
    const { id } = request.params;

    try {
      const result = await regionRepository.deleteAsync(id);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "Region not found",
        });
      }

      return createResponse(response, 200, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "Region could not be deleted",
      });
    } finally {
      client.release();
    }
  },
});

export default regionRoutes;
