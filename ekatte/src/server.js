import http from "http";
import path from "path";
import pg from "pg";
const { Pool } = pg;

import config from "./database/dbConfig.js";
import * as requestUtilities from "./util/requestUtilities.js";

import ServiceContainer from "./serviceContainer.js";
import StatisticsController from "./controllers/statisticsController.js";
import CrudController from "./controllers/crudController.js";
import CrudRepository from "./repository/crudRepository.js";
import Repository from "./repository/repository.js";
import * as serverRoutes from "./routes/routes.js";

const PORT = 3000;
const pool = new Pool(config);

// await fileImport(await pool.connect());

let container = new ServiceContainer();
container.register("pool", pool);
container.register("crudRepository", CrudRepository, ["pool"]);
container.register("crudController", CrudController, ["crudRepository"]);

container.register("statisticsRepository", Repository, ["pool"]);
container.register("statisticsController", StatisticsController, [
  "statisticsRepository",
]);

const controllers = {
  crudController: await container.get("crudController"),
  statisticsController: await container.get("statisticsController"),
};

const server = http.createServer(async (request, response) => {
  try {
    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    const queryObject = Object.fromEntries(parsedUrl.searchParams.entries());
    request.params = queryObject;
    request.pathname = parsedUrl.pathname;
    request.bodyData = await requestUtilities.getRequestBody(request);
    request.extension = path.extname(parsedUrl.pathname);

    const matchedRoute = serverRoutes.matchRoute(
      request,
      request.method,
      request.pathname,
      serverRoutes.routes(controllers)
    );

    if (matchedRoute.route.middlewares.length > 0) {
      await serverRoutes.executeMiddlewares(
        matchedRoute.route.middlewares,
        request,
        response,
        matchedRoute.params
      );
    }

    await matchedRoute.route.handler(request, response, matchedRoute.params);
  } catch (error) {
    console.log(error);
    requestUtilities.createResponse(response, 500, "application/json", {
      errors: error.errors || "Internal Server Error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
