import { createResponse } from "../util/requestUtilities.js";

export default class CrudController {
  constructor(repository) {
    this.repository = repository;
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.getEntities = this.getEntities.bind(this);
    this.getEntitiesOrderedPaginated = this.getEntitiesOrderedPaginated.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this._handleResult = this._handleResult.bind(this);
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

  async getAll(request, response, params) {
    return this._handleResult(this.repository.getAll(request, params), response);
  }

  async getById(request, response, params) {
    return this._handleResult(this.repository.getById(request, params), response);
  }

  async getEntities(request, response, params) {
    return this._handleResult(this.repository.getEntities(request, params), response);
  }

  async getEntitiesOrderedPaginated(request, response, params) {
    return this._handleResult(this.repository.getEntitiesOrderedPaginated(request, params), response);
  }

  async create(request, response, params) {
    return this._handleResult(this.repository.create(request, params), response);
  }

  async update(request, response, params) {
    return this._handleResult(this.repository.update(request, params), response);
  }

  async delete(request, response, params) {
    return this._handleResult(this.repository.delete(request, params), response);
  }
}