import { validateSchema } from "../schemas/validateSchema.js";
import * as requestUtilities from "../util/requestUtilities.js";

const entitySchemas = new Map();
entitySchemas.set("regions");
entitySchemas.set("municipalities");
entitySchemas.set("settlements");
entitySchemas.set("townhalls");

for (const [key] of entitySchemas) {
  let schema = await import(`./../schemas/${key}Schema.js`);
  entitySchemas.set(key, schema.default);
}

export function routes(params) {
  const crudController = params.crudController;
  const statisticsController = params.statisticsController;

  return {
    GET: {
      "/crud/:entity": {
        handler: crudController.getAll,
        middlewares: [],
      },
      "/crud/:entity/query": {
        handler: crudController.getEntitiesOrderedPaginated,
        middlewares: [],
      },
      "/crud/:entity/:id": {
        handler: crudController.getById,
        middlewares: [],
      },
      "/statistics": {
        handler: statisticsController.getStatistics,
        middlewares: [],
      },
      "/public": {
        handler: requestUtilities.serveFile,
        middlewares: [],
      },
    },
    POST: {
      "/crud/:entity": {
        handler: crudController.create,
        middlewares: [validateEntity],
      },
    },
    PUT: {
      "/crud/:entity/:id": {
        handler: crudController.update,
        middlewares: [validateEntity],
      },
    },
    DELETE: {
      "/crud/:entity/:id": {
        handler: crudController.delete,
        middlewares: [],
      },
    },
  };
}

export function matchRoute(request, method, pathname, routes) {
  const requestParams = request.params;
  const routeDefinitions = routes[method];
  let pathParts = pathname.split("/").filter(Boolean);
  const pathPartsSplitResult = pathname.split(".");

  if (Object.keys(requestParams).length > 0) {
    pathParts.push("query");
  }

  if (pathname === "/" || pathPartsSplitResult.length > 1) {
    return { route: routes["GET"]["/public"], params: {} };
  }

  for (const route in routeDefinitions) {
    const routeParts = route.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) continue;

    let params = {};
    let match = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      if (params.entity) {
        params.schema = entitySchemas.get(params.entity);
      }

      return { route: routeDefinitions[route], params };
    }
  }

  throw new Error("Route not found");
}

export async function executeMiddlewares(middlewares, req, res, params) {
  for (const middleware of middlewares) {
    await middleware(req, res, params);
  }
}

function validateEntity(req, res, params) {
  validateSchema(params.schema, req.bodyData);
}
