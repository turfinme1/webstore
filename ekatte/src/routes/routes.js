import { validateSchema } from "../schemas/validateSchema.js";
import { ASSERT_USER, serveFile } from "../util/requestUtilities.js";

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
        middlewares: [validateQueryParams],
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
        handler: serveFile,
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
  const isPublicRoute = pathname === "/" || pathname.includes(".");

  if (Object.keys(requestParams).length > 0) {
    pathParts.push("query");
  }

  if (isPublicRoute) {
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

        ASSERT_USER(params.schema, 404, `${params.entity} not found`);
      }

      return { route: routeDefinitions[route], params };
    }
  }

  ASSERT_USER(false, 404, "Route not found");
}

export async function executeMiddlewares(middlewares, req, res, params) {
  for (const middleware of middlewares) {
    await middleware(req, res, params);
  }
}

function validateEntity(req, res, params) {
  validateSchema(params.schema, req.bodyData);
}

function validateQueryParams(req, res, params) {
  const schema = params.schema;
  const searchParams = req.params.searchParams ? JSON.parse(req.params.searchParams): {};
  const orderParams = req.params.orderParams ? JSON.parse(req.params.orderParams): [];
  let errors = {};

  const invalidSearchParams = Object.keys(searchParams).filter(
    (key) => ! (schema.properties[key]?.searchable || schema.displayProperties[key]?.searchable)
  );

  const invalidOrderParams = orderParams.filter(
    ([key]) => ! (schema.properties[key] || schema.displayProperties[key])
  );

  if (invalidSearchParams.length > 0) {
    errors.searchParams = `Invalid search parameters: ${invalidSearchParams.join(", ")}`;
  }
  
  if (invalidOrderParams.length > 0) {
    errors.orderParams = `Invalid order parameters: ${invalidOrderParams
      .map(([key]) => key)
      .join(", ")}`;
  }

  ASSERT_USER(Object.keys(errors).length === 0, 422, errors);
}
