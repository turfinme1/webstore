const Logger = require("../logger");

describe("Logger", () => {
  let mockDbConnection;
  let mockReq;
  let logger;

  beforeEach(() => {
    mockDbConnection = {
      query: jest.fn().mockResolvedValue({}),
    };

    mockReq = {
      dbConnection: mockDbConnection,
    };

    jest.spyOn(console, "error").mockImplementation(() => {});

    logger = new Logger(mockReq);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("logToDatabase", () => {
    it("should insert log entry into the database successfully", async () => {
      const logObject = {
        admin_user_id: 1,
        user_id: 2,
        error_code_id: "404",
        timestamp: new Date().toISOString(),
        short_description: "Test short description",
        long_description: "Test long description",
      };

      await logger.logToDatabase(logObject);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO logs"),
        expect.any(Array)
      );
      expect(mockDbConnection.query).toHaveBeenCalledTimes(2); // One for insert, one for commit
    });

    it("should handle errors when logging to the database", async () => {
      const logObject = {
        admin_user_id: 1,
        user_id: 2,
        error_code_id: "404",
        timestamp: new Date().toISOString(),
        short_description: "Test short description",
        long_description: "Test long description",
      };

      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await logger.logToDatabase(logObject);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO logs"),
        expect.any(Array)
      );
      expect(console.error).toHaveBeenCalledWith(
        "Error saving log to database:",
        expect.any(Error)
      );
    });
  });

  describe("info", () => {
    it("should call logToDatabase with info level messages", async () => {
      jest.spyOn(logger, 'logToDatabase').mockResolvedValue();
      const infoObject = {
        error_code: 200,
        short_description: "Info log test",
      };

      await logger.info(infoObject);

      // Ensure logToDatabase is called with the expected log object
      expect(logger.logToDatabase).toHaveBeenCalledWith({
        error_code: infoObject.error_code,
        short_description: infoObject.short_description,
        log_level: "INFO",
      });
    });
  });

  describe("error", () => {
    it("should call logToDatabase with error level messages", async () => {
      jest.spyOn(logger, 'logToDatabase').mockResolvedValue();
      const errorObject = {
        params: 500,
        message: "Error log test",
        stack: "stack trace",
      };

      await logger.error(errorObject);

      // Ensure logToDatabase is called with the expected log object
      expect(logger.logToDatabase).toHaveBeenCalledWith({
        error_code: errorObject.params,
        short_description: errorObject.message,
        debug_info: errorObject.stack,
        log_level: "ERROR",
      });
    });
  });
});
