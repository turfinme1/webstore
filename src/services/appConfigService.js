class AppConfigService {
  constructor() {
    this.updateRateLimitSettings = this.updateRateLimitSettings.bind(this);
    this.getRateLimitSettings = this.getRateLimitSettings.bind(this);
  }

  async updateRateLimitSettings(data) {
    const query = `
    UPDATE app_settings 
    SET request_limit = $1, request_window = $2, request_block_duration = $3, password_require_digit = $4, password_require_lowercase = $5, password_require_uppercase = $6, password_require_special = $7, vat_percentage = $8
    WHERE id = 1 RETURNING *`;

    const result = await data.dbConnection.query(query, [
      data.body.request_limit,
      `${data.body.request_window} minutes`,
      `${data.body.request_block_duration} minutes`,
      data.body.password_require_digit || false,
      data.body.password_require_lowercase || false,
      data.body.password_require_uppercase || false,
      data.body.password_require_special || false,
      data.body.vat_percentage || 0,
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
