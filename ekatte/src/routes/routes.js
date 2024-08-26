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
        middlewares: [authenticate, validateEntity],
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
        middlewares: [logRequest],
      },
      "/public": {
        handler: requestUtilities.serveFile,
        middlewares: [],
      },
    },
    POST: {
      "/crud/:entity": {
        handler: crudController.create,
        middlewares: [authenticate, validateEntity],
      },
    },
    PUT: {
      "/crud/:entity/:id": {
        handler: crudController.update,
        middlewares: [authenticate, validateEntity],
      },
    },
    DELETE: {
      "/crud/:entity/:id": {
        handler: crudController.delete,
        middlewares: [authenticate, validateEntity],
      },
    },
  };
}

// Function to match the route
export function matchRoute(request, method, pathname, routes) {
  const requestParams = request.params;
  const routeDefinitions = routes[method];
  let pathParts = pathname.split("/").filter(Boolean);
  const pathPartsSplitResult = pathname.split(".");

  if(Object.keys(requestParams).length > 0) {
    pathParts.push("query");
  }

  if (pathPartsSplitResult.length > 1) {
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

// Function to execute middlewares sequentially
async function executeMiddlewares(middlewares, req, res, params) {
  for (const middleware of middlewares) {
    await new Promise((resolve, reject) => {
      middleware(
        req,
        res,
        (err) => {
          if (err) reject(err);
          resolve();
        },
        params
      );
    });
  }
}

// const server = http.createServer(async (request, response) => {
//   const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
//   const queryObject = Object.fromEntries(parsedUrl.searchParams.entries());
//   request.params = queryObject;
//   request.pathname = parsedUrl.pathname;
//   request.bodyData = await requestUtilities.getRequestBody(request);
//   request.extension = path.extname(parsedUrl.pathname);

//   const matchedRoute = matchRoute(request.method, request.pathname, routes());

//   if (matchedRoute) {
//     const { route, params } = matchedRoute;
//     const { handler, middlewares } = route;

//     try {
//       // await executeMiddlewares(middlewares, request, response, params);
//       await handler(request, response, params);
//       // await handler(25, response);
//     } catch (err) {
//       response.writeHead(500, { "Content-Type": "application/json" });
//       response.end(JSON.stringify({ error: "Internal Server Error" }));
//     }
//   } else {
//     response.writeHead(404, { "Content-Type": "application/json" });
//     response.end(JSON.stringify({ message: "404 - Not Found" }));
//   }
// });

// const PORT = 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// authenticate.js
export function authenticate(req, res, next) {
  const token = req.headers["authorization"];
  if (token) {
    // Assume a function verifyToken exists
    const user = verifyToken(token);
    if (user) {
      req.user = user; // Attach user to request
      return next();
    }
  }
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Unauthorized" }));
}

// logRequest.js
export function logRequest(req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
}

// validateEntity.js
export function validateEntity(req, res, next, params) {
  const { entity } = params;
  if (entitySchemas.has(entity)) {
    req.schema = entitySchemas.get(entity);
    return next();
  }
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Invalid entity" }));
}
