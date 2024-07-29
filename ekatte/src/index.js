import http from "http";
import path from "path";
import fs from "fs";
import pg from "pg";
const { Pool } = pg;

import config from "./database/dbConfig.js";
import routes from "./routes/routes.js";
import {
  serveFile,
  getContentType,
  getFilePath,
  createResponse,
} from "./util/requestUtilities.js";

const PORT = 3000;
const pool = new Pool(config);

// await fileImport(await pool.connect());

const server = http.createServer(async (request, response) => {
  const client = await pool.connect();
  const { method, url } = request;
  const extension = path.extname(url);
  const contentType = getContentType(extension);
  const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
  const queryObject = Object.fromEntries(parsedUrl.searchParams.entries());
  request.params = queryObject;
  const pathName = parsedUrl.pathname;
  const filePath = getFilePath(contentType, pathName, extension);

  console.log("queryObject", queryObject);
  console.log("extension", extension);
  console.log("method", method);
  console.log("request params", request.params);
  console.log("pathname", parsedUrl.pathname);
  const userRoutes = routes({ client });

  const allRoutes = {
    ...userRoutes,
    default: async (request, response) => {
      if (fs.existsSync(filePath)) {
        client.release();
        await serveFile(filePath, contentType, response);
      } else {
        client.release();
        createResponse(response, 404, "text/html", "<h1>404 Not Found</h1>");
      }
    },
  };

  const routeEndpoint = `${pathName}:${method}`;
  const routeHandler = allRoutes[routeEndpoint] || allRoutes.default;
  return await routeHandler(request, response);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
