import statisticsRoutes from "../../routes/statisticsRoutes"; 
import { jest } from "@jest/globals";

describe("statisticsRoutes", () => {
  let statisticsController;
  let routes;
  let mockResponse;
  let mockRequest;

  beforeEach(() => {
    statisticsController = {
      getStatistics: jest.fn(),
    };

    routes = statisticsRoutes(statisticsController);

    mockResponse = {
      writeHead: jest.fn(),
      end: jest.fn(),
    };

    mockRequest = {
        params: {},
        bodyData: "{}",
      };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /statistics route", () => {
    it("should call getStatistics on the controller", async () => {
      await routes["/statistics:GET"](mockRequest, mockResponse);

      expect(statisticsController.getStatistics).toHaveBeenCalledWith(
        mockResponse
      );
    });

    it("should handle errors and return a 500 response", async () => {
      statisticsController.getStatistics.mockRejectedValue(new Error("Test Error"));

      await routes["/statistics:GET"](mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });

      expect(mockResponse.end).toHaveBeenCalledWith(
        JSON.stringify({ error: "Internal Server Error" })
      );
    });
  });
});
