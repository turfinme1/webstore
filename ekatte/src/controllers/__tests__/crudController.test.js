import CrudController from "../crudController.js";
import { jest } from "@jest/globals";

let mockRepository;
let response;
let mockHandler;
let controller;

beforeEach(() => {
  mockRepository = {
    getAll: jest.fn(),
    getById: jest.fn(),
    getEntities: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  response = {
    writeHead: jest.fn(),
    end: jest.fn(),
  };
  mockHandler = jest.fn();
  controller = new CrudController(mockRepository);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("CrudController", () => {
  describe("Repository methods using mock _handleResult", () => {
    beforeEach(() => {
      controller._handleResult = mockHandler;
    });

    describe("getAll", () => {
      it("should call _handleResult with correct arguments and repository method", async () => {
        const mockPromise = Promise.resolve({
          success: true,
          statusCode: 200,
          data: [],
        });
        mockRepository.getAll.mockReturnValue(mockPromise);

        await controller.getAll(response);

        expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
        expect(mockRepository.getAll).toHaveBeenCalledWith();
        expect(mockHandler).toHaveBeenCalledWith(mockPromise, response);
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe("getById", () => {
      it("should call _handleResult with correct arguments and repository method", async () => {
        const id = 1;
        const mockPromise = Promise.resolve({
          success: true,
          statusCode: 200,
          data: { id },
        });
        mockRepository.getById.mockReturnValue(mockPromise);

        await controller.getById(id, response);

        expect(mockRepository.getById).toHaveBeenCalledTimes(1);
        expect(mockRepository.getById).toHaveBeenCalledWith(id);
        expect(mockHandler).toHaveBeenCalledWith(mockPromise, response);
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe("getEntities", () => {
      it("should call _handleResult with correct arguments and repository method", async () => {
        const param = "search";
        const mockPromise = Promise.resolve({
          success: true,
          statusCode: 200,
          data: [],
        });
        mockRepository.getEntities.mockReturnValue(mockPromise);

        await controller.getEntities(param, response);

        expect(mockRepository.getEntities).toHaveBeenCalledTimes(1);
        expect(mockRepository.getEntities).toHaveBeenCalledWith(param);
        expect(mockHandler).toHaveBeenCalledWith(mockPromise, response);
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe("create", () => {
      it("should call _handleResult with correct arguments and repository method", async () => {
        const data = { name: "new" };
        const mockPromise = Promise.resolve({
          success: true,
          statusCode: 201,
          data,
        });
        mockRepository.create.mockReturnValue(mockPromise);

        await controller.create(data, response);

        expect(mockRepository.create).toHaveBeenCalledTimes(1);
        expect(mockRepository.create).toHaveBeenCalledWith(data);
        expect(mockHandler).toHaveBeenCalledWith(mockPromise, response);
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe("update", () => {
      it("should call _handleResult with correct arguments and repository method", async () => {
        const id = 1;
        const data = { name: "updated" };
        const mockPromise = Promise.resolve({
          success: true,
          statusCode: 200,
          data,
        });
        mockRepository.update.mockReturnValue(mockPromise);

        await controller.update(id, data, response);

        expect(mockRepository.update).toHaveBeenCalledTimes(1);
        expect(mockRepository.update).toHaveBeenCalledWith(id, data);
        expect(mockHandler).toHaveBeenCalledWith(mockPromise, response);
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe("delete", () => {
      it("should call _handleResult with correct arguments and repository method", async () => {
        const id = 1;
        const mockPromise = Promise.resolve({
          success: true,
          statusCode: 200,
          data: { id },
        });
        mockRepository.delete.mockReturnValue(mockPromise);

        await controller.delete(id, response);

        expect(mockRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockRepository.delete).toHaveBeenCalledWith(id);
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
