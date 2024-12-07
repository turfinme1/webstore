class Logger {
  constructor(req) {
    this.req = req;
    this.logToDatabase = this.logToDatabase.bind(this);
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
  }

  async logToDatabase(logObject) {
    try {
      await this.req.dbConnection.query(`
        INSERT INTO logs (admin_user_id, user_id, status_code, short_description, long_description, debug_info, log_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          this.req?.session?.admin_user_id || null,
          this.req?.session?.user_id || null,
          logObject?.code || 1,
          logObject?.short_description,
          logObject?.long_description || null,
          logObject?.debug_info || null,
          logObject?.log_level || "ERROR",
        ]
      );
      await this.req.dbConnection.query("COMMIT");
    } catch (error) {
      console.error("Error saving log to database:", error);
    }
  }

  async info(infoObject) {
    const logObject = {
      code: infoObject?.code,
      short_description: infoObject?.short_description,
      long_description: infoObject?.long_description,
      log_level: "INFO",
    };
    await this.logToDatabase(logObject);
  }

  async error(errorObject) {
    const logObject = {
      code: errorObject?.params?.code,
      short_description: errorObject?.message,
      long_description: errorObject?.params?.long_description,
      debug_info: errorObject?.stack,
      log_level: "ERROR",
    };
    await this.logToDatabase(logObject);
  }
}

module.exports = Logger;
