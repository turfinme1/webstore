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
  const filePath = getFilePath(contentType, url, extension);

  console.log("extension", extension);
  console.log("url", url);
  console.log("method", method);

  const userRoutes = routes({ client });

  const allRoutes = {
    ...userRoutes,
    default: async (request, response) => {
      if (fs.existsSync(filePath)) {
        await serveFile(filePath, contentType, response);
      } else {
        createResponse(response, 404, "text/html", "<h1>404 Not Found</h1>");
      }
    },
  };

  const routeEndpoint = `${url}:${method}`;
  const routeHandler = allRoutes[routeEndpoint] || allRoutes.default;
  return await routeHandler(request, response);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
