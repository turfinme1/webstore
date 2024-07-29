import fsPromises from "fs/promises";
import path from "path";
const __dirname = import.meta.dirname;

const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
};

const getFilePath = (contentType, reqUrl, extension) => {
  let filePath;

  if (contentType === "text/html" && reqUrl === "/") {
    filePath = path.join(__dirname, "..", "views", "index.html");
  } else if (contentType === "text/html") {
    filePath = path.join(__dirname, "..", "views", reqUrl);
  } else {
    filePath = path.join(__dirname, "..", reqUrl);
  }

  if (!extension && reqUrl.slice(-1) !== "/") {
    filePath += ".html";
  }

  return filePath;
};

const getContentType = (extension) => {
  switch (extension) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "text/javascript";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
      return "image/jpg";
    default:
      return "text/html";
  }
};

const serveFile = async (filePath, contentType, response) => {
  try {
    const rawData = await fsPromises.readFile(filePath, "utf-8");

    return createResponse(response, 200, contentType, rawData);
  } catch (error) {
    console.log(error);
    response.statusCode = 500;
    response.end();
  }
};

const createResponse = (response, statusCode, contentType, data) => {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(
    contentType === "application/json" ? JSON.stringify(data) : data
  );
};

const mapRequestToEntity = (entityObject, requestObject) => {
  for (const key in requestObject) {
    if (entityObject.hasOwnProperty(key)) {
      entityObject[key] = requestObject[key];
    }
  }
  return entityObject;
};

export {
  getRequestBody,
  getFilePath,
  getContentType,
  serveFile,
  createResponse,
  mapRequestToEntity,
};
