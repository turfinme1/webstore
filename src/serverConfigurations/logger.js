class Logger {
  constructor(req) {
    this.req = req;
    this.logToDatabase = this.logToDatabase.bind(this);
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
  }

  async logToDatabase(logObject) {
    try {
      const longDescription = JSON.stringify({
        request: this.req.method,
        url: this.req.originalUrl,
        headers: this.req.headers,
        cookies: this.req.cookies,
        session: this.req.session,
      });
      await this.req.dbConnection.query(`
        INSERT INTO logs (admin_user_id, user_id, status_code_id, short_description, long_description, debug_info, log_level)
        VALUES ($1, $2, (SELECT id FROM status_codes WHERE code = $3), $4, $5, $6, $7)`,
        [
          this.req.admin_user_id || null,
          this.req.user_id || null,
          logObject.error_code || 1,
          logObject.short_description,
          longDescription,
          logObject.debug_info || null,
          logObject.log_level,
        ]
      );
      await this.req.dbConnection.query("COMMIT");
    } catch (error) {
      console.error("Error saving log to database:", error);
    }
  }

  async info(infoObject) {
    const logObject = {
      error_code: infoObject.error_code,
      short_description: infoObject.short_description,
      log_level: "INFO",
    };
    await this.logToDatabase(logObject);
  }

  async error(errorObject) {
    const logObject = {
      error_code: errorObject.params,
      short_description: errorObject.message,
      debug_info: errorObject.stack,
      log_level: "ERROR",
    };
    await this.logToDatabase(logObject);
  }
}

module.exports = Logger;
