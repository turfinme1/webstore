const { ASSERT_USER, ASSERT } = require("../serverConfigurations/assert");

class DbConnectionWrapper {
  constructor(dbConnection, pool) {
    this.dbConnection = dbConnection;
    this.pool = pool;
    this.backendPid = dbConnection.processID;
    this.query = this.query.bind(this);
    this.release = this.release.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  async query(queryCommand, values) {
    try {
      if (queryCommand === "COMMIT" || queryCommand === "ROLLBACK") {
        await this.dbConnection.query(queryCommand);
        return await this.dbConnection.query("BEGIN");
      }

      return await this.dbConnection.query(queryCommand, values);
    } catch (error) {
      console.error("Database query error:", error);

      ASSERT_USER(error.code !== "23505", "Record already exists", { code: "DATABASE.DB_CON_WRAPPER.00024.INVALID_INPUT_ALREADY_EXISTS", long_description: "Record already exists" });
      ASSERT_USER(error.code !== "23503" && error.table !== "order_items", "Cannot delete product with existing orders", { code: "DATABASE.DB_CON_WRAPPER.00025.INVALID_INPUT_DELETE_ACTIVE_PRODUCT", long_description: "Cannot delete product with existing orders" });
      ASSERT_USER(error.code !== "23503", "Invalid foreign key", { code: "DATABASE.DB_CON_WRAPPER.00025.INVALID_INPUT_FOREIGN_KEY", long_description: "Invalid foreign key" });
      ASSERT_USER(error.code !== "23514", "Check constraint failed", { code: "DATABASE.DB_CON_WRAPPER.00026.INVALID_INPUT_CHECK_CONSTRAINT", long_description: "Check constraint failed" });
      ASSERT_USER(error.code !== "22001", "Data too long for column" , { code: "DATABASE.DB_CON_WRAPPER.00027.INVALID_INPUT_DATA_TOO_LONG", long_description: "Data too long for column" });
      ASSERT_USER(error.code !== "80000", "Order status cannot be reverted", { code: "DATABASE.DB_CON_WRAPPER.00028.INVALID_INPUT_ORDER_STATUS", long_description: "Cannot change the status of the order" });
      ASSERT(false, "Internal server error", { code: "DATABASE.DB_CON_WRAPPER.00029.QUERY_ERROR", long_description: `MESSAGE: ${error.message}\nQUERY: ${queryCommand}\nDETAIL: ${error.detail}\nSTACK: ${error.stack}` });
    }
  }

  async cancel() {
    const result = await this.pool.query("SELECT pg_cancel_backend($1)", [this.backendPid]);
    return result;
  }

  release() {
    return this.dbConnection.release();
  }
}

module.exports = { DbConnectionWrapper };
