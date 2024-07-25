import {
  getRequestBody,
  createResponse,
  mapRequestToEntity,
} from "../util/requestUtilities.js";
import { validateMunicipalityEntity } from "../util/validation.js";

const municipalityEntity = {
  municipality_code: "",
  name_en: "",
  name: "",
  region_id: "",
};

const municipalityRoutes = (client, municipalityRepository) => ({
  "/municipalities:GET": async (request, response) => {
    const { id } = request.params;
    console.log("Received JSON data:", request.params);

    try {
      if (id) {
        const result = await municipalityRepository.getByIdAsync(id);

        if (!result) {
          return createResponse(response, 404, "application/json", result);
        }
        return createResponse(response, 200, "application/json", result);
      }

      const result = await municipalityRepository.getAllAsync();
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

  "/municipalities:POST": async (request, response) => {
    const body = await getRequestBody(request);

    try {
      const requestObject = JSON.parse(body);

      const erors = validateMunicipalityEntity(requestObject);
      if (erors.length > 0) {
        return createResponse(response, 400, "application/json", {
          error: erors,
        });
      }

      const entity = mapRequestToEntity(municipalityEntity, requestObject);

      const result = await municipalityRepository.createAsync(entity);
      return createResponse(response, 201, "application/json", result);
    } catch (e) {
      console.log(e);
      return createResponse(response, 400, "application/json", {
        error: "Municipality could not be created",
      });
    } finally {
      client.release();
    }
  },

  "/municipalities:PUT": async (request, response) => {
    const { id } = request.params;
    const body = await getRequestBody(request);

    try {
      const requestObject = JSON.parse(body);

      const erors = validateMunicipalityEntity(requestObject);
      if (erors.length > 0) {
        return createResponse(response, 400, "application/json", {
          error: erors,
        });
      }

      const entity = mapRequestToEntity(municipalityEntity, requestObject);

      const result = await municipalityRepository.updateAsync(id, entity);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "Municipality not found",
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

  "/municipalities:DELETE": async (request, response) => {
    const { id } = request.params;

    try {
      const result = await municipalityRepository.deleteAsync(id);

      if (!result) {
        return createResponse(response, 404, "application/json", {
          error: "Municipality not found",
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

export default municipalityRoutes;
