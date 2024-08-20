import { validateSchema } from "../schemas/validateSchema.js";
import { createResponse } from "../util/requestUtilities.js";

export const createCrudRoutes = (entitySchema, entityController) => {
  const entityName = entitySchema.routeName;

  return {
    [`/${entityName}:GET`]: async (request, response) => {
      try {
        const { id , name, ...searchOrderPaginateParams } = request.params;
        console.log(request.params);
        if (id) {
          await entityController.getById(id, response);
        } else if (name) {
          await entityController.getEntities(name, response);
        } else if (searchOrderPaginateParams){
          await entityController.getEntitiesOrderedPaginated(searchOrderPaginateParams, response);
        } else {
          await entityController.getAll(response);
        }
      } catch (error) {
        console.log(error);
        return createResponse(response, 500, "application/json", {
          error: "Internal Server Error",
        });
      }
    },

    [`/${entityName}:POST`]: async (request, response) => {
      try {
        const bodyObject = request.bodyData;
        validateSchema(entitySchema, bodyObject);
        await entityController.create(bodyObject, response);
      } catch (error) {
        console.log(error);
        return createResponse(response, 500, "application/json", {
          errors: error.errors || `${entityName} could not be created`,
        });
      }
    },

    [`/${entityName}:PUT`]: async (request, response) => {
      try {
        const { id } = request.params;
        const bodyObject = request.bodyData;
        validateSchema(entitySchema, bodyObject);
        await entityController.update(id, bodyObject, response);
      } catch (error) {
        console.log(error);
        return createResponse(response, 500, "application/json", {
          errors:
            error.errors ||
            `${entityName} could not be updated (code duplicate)`,
        });
      }
    },

    [`/${entityName}:DELETE`]: async (request, response) => {
      try {
        const { id } = request.params;
        await entityController.delete(id, response);
      } catch (error) {
        console.log(error);
        return createResponse(response, 500, "application/json", {
          error: "Internal Server Error",
        });
      }
    },
  };
};
