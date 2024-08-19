import {
  getRequestBody,
  getContentType,
  createResponse,
} from "../requestUtilities.js";
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

      await expect(getRequestBody(req)).resolves.toEqual({});
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
