import {
  getRequestBody,
  getFilePath,
  getContentType,
  serveFile,
  createResponse,
} from "../requestUtilities.js";
import fsPromises from "fs/promises";
import path from "path";
import { jest } from "@jest/globals";

jest.mock("path", () => ({
  join: jest.fn(),
}));

jest.mock("fs/promises");

describe("requestUtilities", () => {
  describe("getRequestBody", () => {
    it("should return parsed JSON when body is valid JSON", async () => {
      const req = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ key: "value" }));
        },
      };

      const result = await getRequestBody(req);
      expect(result).toEqual({ key: "value" });
    });

    it("should throw an error when body is invalid JSON", async () => {
      const req = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from("invalid json");
        },
      };

      await expect(getRequestBody(req)).rejects.toThrow("Invalid JSON");
    });

    it("should return empty object when body is empty", async () => {
      const req = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from("");
        },
      };

      await expect(getRequestBody(req)).rejects.toThrow("Invalid JSON");
    });
  });

  describe("getContentType", () => {
    it.each([
      [".html", "text/html"],
      [".css", "text/css"],
      [".js", "text/javascript"],
      [".json", "application/json"],
      [".png", "image/png"],
      [".jpg", "image/jpg"],
      [".unknown", "text/html"],
    ])("should return correct content type for %s", (extension, expected) => {
      expect(getContentType(extension)).toBe(expected);
    });
  });

  describe("serveFile", () => {
    let mockResponse;

    beforeEach(() => {
      mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      };
    });

    it("should serve file content with correct headers and status code 200", async () => {
      const filePath = "/mocked/path";
      const contentType = "text/html";
      const fileContent = "<html></html>";

      fsPromises.readFile.mockResolvedValue(fileContent);

      await serveFile(filePath, contentType, mockResponse);

      expect(fsPromises.readFile).toHaveBeenCalledWith(filePath, "utf-8");
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": contentType,
      });
      expect(mockResponse.end).toHaveBeenCalledWith(fileContent);
    });

    it("should respond with status code 500 if file reading fails", async () => {
      const filePath = "/mocked/path";
      const contentType = "text/html";

      fsPromises.readFile.mockRejectedValue(new Error("File not found"));

      await serveFile(filePath, contentType, mockResponse);

      expect(mockResponse.statusCode).toBe(500);
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe("createResponse", () => {
    let mockResponse;

    beforeEach(() => {
      mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
      };
    });

    it("should set the correct headers and respond with JSON data", () => {
      const data = { key: "value" };
      createResponse(mockResponse, 200, "application/json", data);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(mockResponse.end).toHaveBeenCalledWith(JSON.stringify(data));
    });

    it("should set the correct headers and respond with non-JSON data", () => {
      const data = "<html></html>";
      createResponse(mockResponse, 200, "text/html", data);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "text/html",
      });
      expect(mockResponse.end).toHaveBeenCalledWith(data);
    });
  });
});
