import StatisticsController from "../statisticsController.js";
import { jest } from "@jest/globals";

let mockRepository;
let response;
let mockHandler;
let controller;

beforeEach(() => {
  mockRepository = {
    getStatistics: jest.fn(),
  };
  response = {
    writeHead: jest.fn(),
    end: jest.fn(),
  };
  mockHandler = jest.fn();
  controller = new StatisticsController(mockRepository);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("CrudController", () => {
  describe("Repository methods using mock _handleResult", () => {
    beforeEach(() => {
      controller._handleResult = mockHandler;
    });

    describe("getStatistics", () => {
      it("should call _handleResult with correct arguments and repository method", async () => {
        const mockPromise = Promise.resolve({
          success: true,
          statusCode: 200,
          data: [],
        });
        mockRepository.getStatistics.mockReturnValue(mockPromise);

        await controller.getStatistics(response);

        expect(mockRepository.getStatistics).toHaveBeenCalledTimes(1);
        expect(mockRepository.getStatistics).toHaveBeenCalledWith();
        expect(mockHandler).toHaveBeenCalledWith(mockPromise, response);
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("_handleResult", () => {
    it("should return a successful response when the promise resolves successfully", async () => {
      const mockPromise = Promise.resolve({
        success: true,
        statusCode: 200,
        data: { id: 1 },
      });

      await controller._handleResult(mockPromise, response);

      expect(response.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(response.end).toHaveBeenCalledWith(JSON.stringify({ id: 1 }));
    });

    it("should return an error response when the promise rejects", async () => {
      try {
        await controller._handleResult(
          Promise.reject({
            statusCode: 400,
            errors: ["error"],
          }),
          response
        );
      } catch (error) {}

      expect(response.writeHead).toHaveBeenCalledWith(400, {
        "Content-Type": "application/json",
      });
      expect(response.end).toHaveBeenCalled();
    });

    it("should return an error response when result.success is false", async () => {
      const mockPromise = Promise.resolve({
        success: false,
        statusCode: 400,
        errors: ["Error occurred"],
      });

      await controller._handleResult(mockPromise, response);

      expect(response.writeHead).toHaveBeenCalledWith(400, {
        "Content-Type": "application/json",
      });
      expect(response.end).toHaveBeenCalled();
    });
  });
});
