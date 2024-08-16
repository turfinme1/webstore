import http from "http";
import path from "path";
import pg from "pg";
const { Pool } = pg;

import config from "./database/dbConfig.js";
import * as requestUtilities from "./util/requestUtilities.js";
import isDirectoryAlreadyCreated from "./util/directoryUtilities.js";
import ServiceContainer from "./serviceContainer.js";
import statisticsRoutes from "./routes/statisticsRoutes.js";
import StatisticsController from "./controllers/statisticsController.js";
import { municipalitySchema } from "./schemas/municipalityEntitySchema.js";
import { settlementSchema } from "./schemas/settlementEntitySchema.js";
import { regionSchema } from "./schemas/regionEntitySchema.js";
import { townHallSchema } from "./schemas/townHallEntitySchema.js";
import { createCrudRoutes } from "./routes/createCrudRoutes.js";
import CrudController from "./controllers/crudController.js";
import CrudRepository from "./repository/crudRepository.js";
import Repository from "./repository/repository.js";

const PORT = 3000;
const pool = new Pool(config);

// await fileImport(await pool.connect());

let container = new ServiceContainer();
container.register("pool", pool);
container.register("municipalityEntitySchema", municipalitySchema);
container.register("settlementEntitySchema", settlementSchema);
container.register("regionEntitySchema", regionSchema);
container.register("townhallEntitySchema", townHallSchema);
container.register("municipalityRepository", CrudRepository, [
  "pool",
  "municipalityEntitySchema",
]);
container.register("townHallRepository", CrudRepository, [
  "pool",
  "townhallEntitySchema",
]);
container.register("regionRepository", CrudRepository, [
  "pool",
  "regionEntitySchema",
]);
container.register("settlementRepository", CrudRepository, [
  "pool",
  "settlementEntitySchema",
]);
container.register("municipalityController", CrudController, [
  "municipalityRepository",
]);
container.register("townHallController", CrudController, [
  "townHallRepository",
]);
container.register("regionController", CrudController, ["regionRepository"]);
container.register("settlementController", CrudController, [
  "settlementRepository",
]);
container.register("statisticsRepository", Repository, ["pool"]);
container.register("statisticsController", StatisticsController, ["statisticsRepository"]);


const server = http.createServer(async (request, response) => {
  try {
    const { method, url } = request;
    const extension = path.extname(url);
    const contentType = requestUtilities.getContentType(extension);
    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    const queryObject = Object.fromEntries(parsedUrl.searchParams.entries());
    request.params = queryObject;
    const pathName = parsedUrl.pathname;
    const filePath = requestUtilities.getFilePath(
      contentType,
      pathName,
      extension
    );
    request.bodyData = await requestUtilities.getRequestBody(request);
    const settlementRoutes = createCrudRoutes(
      await container.get("settlementEntitySchema"),
      await container.get("settlementController")
    );
    const regionRoutes = createCrudRoutes(
      await container.get("regionEntitySchema"),
      await container.get("regionController")
    );
    const municipalityRoutes = createCrudRoutes(
      await container.get("municipalityEntitySchema"),
      await container.get("municipalityController")
    );
    const townHallRoutes = createCrudRoutes(
      await container.get("townhallEntitySchema"),
      await container.get("townHallController")
    );
    const statRoutes = statisticsRoutes(
      await container.get("statisticsController")
    );

    const allRoutes = {
      ...townHallRoutes,
      ...regionRoutes,
      ...municipalityRoutes,
      ...settlementRoutes,
      ...statRoutes,
      default: async (request, response) => {
        if (await isDirectoryAlreadyCreated(filePath)) {
          await requestUtilities.serveFile(filePath, contentType, response);
        } else {
          requestUtilities.createResponse(
            response,
            404,
            "text/html",
            "<h1>404 Not Found</h1>"
          );
        }
      },
    };

    const routeEndpoint = `${pathName}:${method}`;
    const routeHandler = allRoutes[routeEndpoint] || allRoutes.default;
    return await routeHandler(request, response);
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
