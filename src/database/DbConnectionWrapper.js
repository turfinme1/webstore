const ERROR_CODES = require("../serverConfigurations/constants");
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

      ASSERT_USER(error.code !== "23505", "Record already exists", ERROR_CODES.INVALID_INPUT);
      ASSERT_USER(error.code !== "23503", "Invalid foreign key", ERROR_CODES.INVALID_INPUT);
      ASSERT_USER(error.code !== "23514", "Check constraint failed", ERROR_CODES.INVALID_INPUT);
      ASSERT_USER(error.code !== "22001", "Data too long for column" , ERROR_CODES.INVALID_INPUT);
      ASSERT(false, "Internal server error");
    }
  }

  release() {
    return this.dbConnection.release();
  }
}

module.exports = { DbConnectionWrapper };
