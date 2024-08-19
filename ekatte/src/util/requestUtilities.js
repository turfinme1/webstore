import fsPromises from "fs/promises";
import path from "path";
const __dirname = import.meta.dirname;

export async function getRequestBody(req) {
  let body = "";

  try {
    for await (const chunk of req) {
      body += chunk.toString();
    }

    if (! body) {
      return {};
    } else {
      return JSON.parse(body);
    }
  } catch (err) {
    console.log(err);
    throw new Error("Invalid JSON");
  }
}

export function getFilePath(contentType, reqUrl, extension) {
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
}

export function getContentType(extension) {
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
}

export async function serveFile(filePath, contentType, response) {
  try {
    const rawData = await fsPromises.readFile(filePath, "utf-8");

    return createResponse(response, 200, contentType, rawData);
  } catch (error) {
    console.log(error);
    response.statusCode = 500;
    response.end();
  }
}

export function createResponse(response, statusCode, contentType, data) {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(
    contentType === "application/json" ? JSON.stringify(data) : data
  );
}