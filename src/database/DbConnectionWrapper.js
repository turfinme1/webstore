const STATUS_CODES = require("../serverConfigurations/constants");
const { ASSERT_USER, ASSERT } = require("../serverConfigurations/assert");

class DbConnectionWrapper {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
    this.query = this.query.bind(this);
    this.release = this.release.bind(this);
  }

  async query(queryCommand, values) {
    try {
      if (queryCommand === "COMMIT") {
        await this.dbConnection.query("COMMIT");
        return await this.dbConnection.query("BEGIN");
      }

      return await this.dbConnection.query(queryCommand, values);
    } catch (error) {
      console.error("Database query error:", error);

      ASSERT_USER(error.code !== "23505", "Record already exists", STATUS_CODES.INVALID_INPUT);
      ASSERT_USER(error.code !== "23503", "Invalid foreign key", STATUS_CODES.INVALID_INPUT);
      ASSERT_USER(error.code !== "23514", "Check constraint failed", STATUS_CODES.INVALID_INPUT);
      ASSERT_USER(error.code !== "22001", "Data too long for column" , STATUS_CODES.INVALID_INPUT);
      ASSERT(false, "Internal server error");
    }
  }

  release() {
    return this.dbConnection.release();
  }
}

module.exports = { DbConnectionWrapper };
