const { PeerError, UserError } = require("../assert");
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
        long_description: "",
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
        code: 200,
        short_description: "Info log short description", 
        long_description: "Info log long description",
      };

      await logger.info(infoObject);

      // Ensure logToDatabase is called with the expected log object
      expect(logger.logToDatabase).toHaveBeenCalledWith({
        code: infoObject.code,
        short_description: infoObject.short_description,
        long_description: infoObject.long_description,
        log_level: "INFO",
        audit_type: "INFO",
      });
    });
  });

  describe("error", () => {
    beforeEach(() => {
      jest.spyOn(logger, 'logToDatabase').mockResolvedValue();
    });
  
    it("should set audit_type to TEMPORARY for temporary errors", async () => {
      const errorObject = {
        params: { 
          temporary: true,
          code: 503,
          long_description: "Temporary error" 
        },
        message: "Service temporarily unavailable",
        stack: "stack trace"
      };
  
      await logger.error(errorObject);
  
      expect(logger.logToDatabase).toHaveBeenCalledWith({
        code: 503,
        short_description: "Service temporarily unavailable",
        long_description: "Temporary error",
        debug_info: "stack trace",
        log_level: "ERROR",
        audit_type: "TEMPORARY"
      });
    });
  
    it("should set audit_type to ASSERT_USER for UserError", async () => {
      const errorObject = new UserError("Invalid input", {
        code: 400,
        long_description: "User validation failed"
      });
  
      await logger.error(errorObject);
  
      expect(logger.logToDatabase).toHaveBeenCalledWith({
        code: 400,
        short_description: "Invalid input",
        long_description: "User validation failed",
        debug_info: expect.any(String),
        log_level: "ERROR",
        audit_type: "ASSERT_USER"
      });
    });
  
    it("should set audit_type to TEMPORARY for PeerError", async () => {
      const errorObject = new PeerError("External service error", {
        code: 502,
        long_description: "External API failed"
      });
  
      await logger.error(errorObject);
  
      expect(logger.logToDatabase).toHaveBeenCalledWith({
        code: 502,
        short_description: "External service error",
        long_description: "External API failed",
        debug_info: expect.any(String),
        log_level: "ERROR",
        audit_type: "TEMPORARY"
      });
    });
  
    it("should default to ASSERT audit_type for other errors", async () => {
      const errorObject = new Error("Unknown error");
      errorObject.params = {
        code: 500,
        long_description: "System error occurred"
      };
  
      await logger.error(errorObject);
  
      expect(logger.logToDatabase).toHaveBeenCalledWith({
        code: 500,
        short_description: "Unknown error",
        long_description: "System error occurred",
        debug_info: expect.any(String),
        log_level: "ERROR",
        audit_type: "ASSERT"
      });
    });
  });

  // describe("error", () => {
  //   it("should call logToDatabase with error level messages", async () => {
  //     jest.spyOn(logger, 'logToDatabase').mockResolvedValue();
  //     const errorObject = {
  //       params: { code: 404, long_description: "Error log long description" },
  //       message: "Error log test",
  //       stack: "stack trace",
  //     };

  //     await logger.error(errorObject);

  //     // Ensure logToDatabase is called with the expected log object
  //     expect(logger.logToDatabase).toHaveBeenCalledWith({
  //       code: errorObject.params.code,
  //       short_description: errorObject.message,
  //       long_description: errorObject.params.long_description,
  //       debug_info: errorObject.stack,
  //       log_level: "ERROR",
  //       audit_type: "ASSERT",
  //     });
  //   });
  // });
});
