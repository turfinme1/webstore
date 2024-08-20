import { createResponse } from "../util/requestUtilities.js";

export default class CrudController {
  constructor(repository) {
    this.repository = repository;
  }

  async _handleResult(promise, response) {
    try {
      const result = await promise;
      if (result.success) {
        return createResponse(response, result.statusCode, "application/json", result.data);
      } else {
        return createResponse(response, result.statusCode, "application/json", { errors: result.errors });
      }
    } catch (error) {
      console.log(error);
      return createResponse(response, error.statusCode, "application/json", { errors: error.errors });
    }
  }

  async getAll(response) {
    return this._handleResult(this.repository.getAll(), response);
  }

  async getById(data, response) {
    return this._handleResult(this.repository.getById(data), response);
  }

  async getEntities(data, response) {
    return this._handleResult(this.repository.getEntities(data), response);
  }

  async getEntitiesOrderedPaginated(data, response) {
    return this._handleResult(this.repository.getEntitiesOrderedPaginated(data), response);
  }

  async create(data, response) {
    return this._handleResult(this.repository.create(data), response);
  }

  async update(id, data, response) {
    return this._handleResult(this.repository.update(id, data), response);
  }

  async delete(data, response) {
    return this._handleResult(this.repository.delete(data), response);
  }
}
