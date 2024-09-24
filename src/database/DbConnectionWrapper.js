const { ASSERT_USER, ASSERT } = require("../serverConfigurations/assert");

class DbConnectionWrapper {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
    this.query = this.query.bind(this);
    this.release = this.release.bind(this);
  }

  async query(queryCommand, values) {
    try {
      return await this.dbConnection.query(queryCommand, values);
    } catch (error) {
      console.error("Database query error:", error);

      ASSERT_USER(error.code !== "23505", "Record already exists");
      ASSERT_USER(error.code !== "23503", "Invalid foreign key");
      ASSERT_USER(error.code !== "23514", "Check constraint failed");
      ASSERT_USER(error.code !== "22001", "Data too long for column");
      ASSERT(false, "Internal server error");
    }
  }

  release() {
    return this.dbConnection.release();
  }
}

module.exports = { DbConnectionWrapper };
