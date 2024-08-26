import http from "http";
import path from "path";
import pg from "pg";
const { Pool } = pg;

import config from "./database/dbConfig.js";
import * as requestUtilities from "./util/requestUtilities.js";

import ServiceContainer from "./serviceContainer.js";
import statisticsRoutes from "./routes/statisticsRoutes.js";
import StatisticsController from "./controllers/statisticsController.js";
import CrudController from "./controllers/crudController1.js";
import CrudRepository from "./repository/crudRepository1.js";
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

const server = http.createServer(async (request, response) => {
  try {
    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    const queryObject = Object.fromEntries(parsedUrl.searchParams.entries());
    request.params = queryObject;
    request.pathname = parsedUrl.pathname;
    request.bodyData = await requestUtilities.getRequestBody(request);
    request.extension = path.extname(parsedUrl.pathname);

    const controllers = {
      crudController: await container.get("crudController"),
      statisticsController: await container.get("statisticsController"),
    };
    
    const crudController =await container.get("crudController");
    const statisticsController = await container.get("statisticsController");
    const matchedRoute = serverRoutes.matchRoute(
      request,
      request.method,
      request.pathname,
      serverRoutes.routes(controllers)
    );

    const { route, params } = matchedRoute;
    const { handler, middlewares } = route;

    await handler(request, response, params);
  } catch (error) {
    console.log(error);
    requestUtilities.createResponse(response, 500, "application/json", {
      error: "Internal Server Error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
