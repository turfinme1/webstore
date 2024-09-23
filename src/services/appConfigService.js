class AppConfigService {
  constructor() {
    this.updateRateLimitSettings = this.updateRateLimitSettings.bind(this);
    this.getRateLimitSettings = this.getRateLimitSettings.bind(this);
  }

  async updateRateLimitSettings(data) {
    const query = `
    UPDATE app_settings 
    SET request_limit = $1, request_window = $2, request_block_duration = $3
    WHERE id = 1 RETURNING *`;

    const result = await data.dbConnection.query(query, [
      data.body.request_limit,
      data.body.request_window,
      data.body.request_block_duration,
    ]);
    return { message: "Rate limit settings updated" };
  }

  async getRateLimitSettings(data) {
    const result = await data.dbConnection.query(`
      SELECT * FROM app_settings WHERE id = 1`
    );
    return result.rows[0];
  }
}

module.exports = AppConfigService;
