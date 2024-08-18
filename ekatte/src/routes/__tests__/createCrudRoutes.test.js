import { createCrudRoutes } from "../createCrudRoutes.js";
// import { validateSchema } from "../../schemas/validateSchema.js";
import { jest } from "@jest/globals";

// jest.mock("../../schemas/validateSchema.js", () => ({
//   __esModule: true,
//   default: jest.fn(),
// }));

describe("createCrudRoutes", () => {
  let entityController;
  let routes;
  let mockResponse;
  let mockRequest;
  let entitySchema;

  beforeEach(() => {
    entityController = {
      getById: jest.fn(),
      getEntities: jest.fn(),
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    entitySchema = { routeName: "test" };
    routes = createCrudRoutes(entitySchema, entityController);

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

  describe("GET route", () => {
    it("should call getById when id is provided", async () => {
      mockRequest.params = { id: "1" };

      await routes["/test:GET"](mockRequest, mockResponse);

      expect(entityController.getById).toHaveBeenCalledWith("1", mockResponse);
    });

    it("should call getEntities when name is provided", async () => {
      mockRequest.params = { name: "testName" };

      await routes["/test:GET"](mockRequest, mockResponse);

      expect(entityController.getEntities).toHaveBeenCalledWith(
        "testName",
        mockResponse
      );
    });

    it("should call getAll when neither id nor name is provided", async () => {
      await routes["/test:GET"](mockRequest, mockResponse);

      expect(entityController.getAll).toHaveBeenCalledWith(mockResponse);
    });

    it("should handle errors and return a 500 response", async () => {
      entityController.getAll.mockRejectedValue(new Error("error"));

      await routes["/test:GET"](mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(mockResponse.end).toHaveBeenCalledWith(
        JSON.stringify({ error: "Internal Server Error" })
      );
    });
  });

  describe("POST route", () => {
    it("should validate schema and call create", async () => {
      mockRequest.bodyData = { key: "value" };

      await routes["/test:POST"](mockRequest, mockResponse);

      expect(entityController.create).toHaveBeenCalledWith(
        { key: "value" },
        mockResponse
      );
    });

    // it("should handle schema validation errors", async () => {
    //   validateSchema.mockImplementation(() => {
    //     throw { errors: ["Schema error"] };
    //   });

    //   mockRequest.bodyData = JSON.stringify({});

    //   await routes["/test:POST"](mockRequest, mockResponse);

    //   expect(mockResponse.writeHead).toHaveBeenCalledWith(400, {
    //     "Content-Type": "application/json",
    //   });
    //   expect(mockResponse.end).toHaveBeenCalledWith(
    //     JSON.stringify({ errors: ["Schema error"] })
    //   );
    // });

    it("should handle other errors and return a 400 response", async () => {
      entityController.create.mockRejectedValue(new Error("error"));

      await routes["/test:POST"](mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(mockResponse.end).toHaveBeenCalledWith(
        JSON.stringify({ errors: "test could not be created" })
      );
    });
  });

  describe("PUT route", () => {
    it("should validate schema and call update", async () => {
      mockRequest.params = { id: "1" };
      mockRequest.bodyData = { key: "value" };

      await routes["/test:PUT"](mockRequest, mockResponse);
      expect(entityController.update).toHaveBeenCalledWith(
        "1",
        { key: "value" },
        mockResponse
      );
    });

    // it("should handle schema validation errors", async () => {
    //   validateSchema.mockImplementation(() => {
    //     throw { errors: ["Schema error"] };
    //   });

    //   mockRequest.params = { id: "1" };
    //   mockRequest.bodyData = JSON.stringify({});

    //   await routes["/test:PUT"](mockRequest, mockResponse);

    //   expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
    //     "Content-Type": "application/json",
    //   });
    //   expect(mockResponse.end).toHaveBeenCalledWith(
    //     JSON.stringify({ errors: ["Schema error"] })
    //   );
    // });

    it("should handle other errors and return a 500 response", async () => {
      entityController.update.mockRejectedValue(new Error("error"));

      await routes["/test:PUT"](mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(mockResponse.end).toHaveBeenCalledWith(
        JSON.stringify({
          errors: "test could not be updated (code duplicate)",
        })
      );
    });
  });

  describe("DELETE route", () => {
    it("should call delete with id", async () => {
      mockRequest.params = { id: "1" };

      await routes["/test:DELETE"](mockRequest, mockResponse);

      expect(entityController.delete).toHaveBeenCalledWith("1", mockResponse);
    });

    it("should handle errors and return a 500 response", async () => {
      entityController.delete.mockRejectedValue(new Error("error"));

      await routes["/test:DELETE"](mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(mockResponse.end).toHaveBeenCalledWith(
        JSON.stringify({ error: "Internal Server Error" })
      );
    });
  });
});
