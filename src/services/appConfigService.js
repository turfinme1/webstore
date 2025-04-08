class AppConfigService {
  constructor() {
    this.updateRateLimitSettings = this.updateRateLimitSettings.bind(this);
    this.getRateLimitSettings = this.getRateLimitSettings.bind(this);
  }

  async updateRateLimitSettings(data) {
    const query = `
    UPDATE app_settings 
    SET request_limit = $1, request_window = $2, request_block_duration = $3, password_require_digit = $4, password_require_lowercase = $5, password_require_uppercase = $6, password_require_special = $7, vat_percentage = $8, report_row_limit_display = $9, campaign_status_update_interval = $10, target_group_status_update_interval = $11, target_group_status_update_initial_time = $12, user_group_chart_count = $13, campaign_chart_count = $14
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
      data.body.report_row_limit_display || 0,
     `${data.body.campaign_status_update_interval} minutes`,
      `${data.body.target_group_status_update_interval} minutes`,
      data.body.target_group_status_update_initial_time,
      data.body.user_group_chart_count,
      data.body.campaign_chart_count,
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
