import { createResponse } from "../util/requestUtilities.js";

export default class StatisticsController {
  constructor(repository) {
    this.repository = repository;
    this.getStatistics = this.getStatistics.bind(this);
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

  async getStatistics(request, response, params) {
    return this._handleResult(this.repository.getStatistics(), response);
  }
}
