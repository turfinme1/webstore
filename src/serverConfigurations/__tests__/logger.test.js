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
    it("should log info level messages", async () => {
      const infoObject = {
        admin_user_id: 1,
        user_id: 2,
        error_code_id: "200",
        short_description: "Info log test",
        long_description: "This is an info log test description.",
      };

      await logger.info(infoObject);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO logs"),
        expect.any(Array)
      );
      expect(mockDbConnection.query).toHaveBeenCalledTimes(2); // One for insert, one for commit
      expect(infoObject.log_level).toBe("INFO"); // Ensure log level is set correctly
    });
  });

  describe("error", () => {
    it("should log error level messages", async () => {
      const errorObject = {
        admin_user_id: 1,
        user_id: 2,
        error_code_id: "500",
        short_description: "Error log test",
        long_description: "This is an error log test description.",
      };

      await logger.error(errorObject);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO logs"),
        expect.any(Array)
      );
      expect(mockDbConnection.query).toHaveBeenCalledTimes(2); // One for insert, one for commit
      expect(errorObject.log_level).toBe("ERROR"); // Ensure log level is set correctly
    });
  });
});
