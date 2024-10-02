class Logger {
  constructor(req) {
    this.req = req;
    this.logToDatabase = this.logToDatabase.bind(this);
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
  }

  async logToDatabase(logObject) {
    try {
      const keys = Object.keys(logObject);
      const values = keys.map((key) => logObject[key]);
      await this.req.dbConnection.query(`
        INSERT INTO logs (admin_user_id, user_id, error_code_id, timestamp, short_description, long_description, log_level)
        VALUES ($1, $2, (SELECT id FROM error_codes WHERE code = $3), $4, $5, $6, $7)`,
        values
      );
      await this.req.dbConnection.query("COMMIT");
    } catch (error) {
      console.error("Error saving log to database:", error);
    }
  }

  async info(infoObject) {
    infoObject.log_level = "INFO";
    await this.logToDatabase(infoObject);
  }

  async error(errorObject) {
    errorObject.log_level = "ERROR";
    await this.logToDatabase(errorObject);
  }
}

module.exports = Logger;
