const { PeerError, UserError } = require("../assert");
const { ENV } = require("../constants");
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

    jest.replaceProperty(ENV, "ISSUES_URL", "http://example.com/issues");
    jest.replaceProperty(ENV, "BRANCH", "web-store-rc");
    jest.replaceProperty(ENV, "REPO_OWNER", "telebid-interns");
    jest.replaceProperty(ENV, "REPO_NAME", "borislav.a-training");

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
      // expect(console.error).toHaveBeenCalledWith(
      //   "Error saving log to database:",
      //   expect.any(Error)
      // );
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

  describe("createIssue", () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it("should parse the error stack and call fetch with correct fileName and lineNumber", async () => {
      const errorObject = new Error("Test error message");
      errorObject.stack = `Error: Test error message
      at AuthService.verifyCaptcha (/home/tb-intern1/Desktop/repo/borislav.a-training/src/services/authService.js:313:16)
      at processTicksAndRejections (internal/process/task_queues.js:95:5)`;
  
      await logger.createIssue(errorObject);
  
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = global.fetch.mock.calls[0];
      const url = fetchCall[0];
      const options = fetchCall[1];
      const body = JSON.parse(options.body);
  
      expect(url).toEqual(ENV.ISSUES_URL);
      expect(options.method).toEqual("POST");
      expect(options.headers["Content-Type"]).toEqual("application/json");
  
      expect(body.branch).toEqual(ENV.BRANCH);
      expect(body.repoOwner).toEqual(ENV.REPO_OWNER);
      expect(body.repoName).toEqual(ENV.REPO_NAME);
      expect(body.error.message).toEqual(errorObject.message);
      expect(body.error.stackTrace).toEqual(errorObject.stack);
      expect(body.error.fileName).toEqual("authService.js");
      expect(body.error.lineNumber).toEqual("313");
    });

    it("should use the third line of the stack if the second line contains 'assert'", async () => {
      const errorObject = new Error("Test assert error");
      errorObject.stack = `Error: Test assert error
      at ASSERT (/home/tb-intern1/Desktop/repo/borislav.a-training/src/serverConfigurations/assert.js:50:5)
      at AuthService.verifyCaptcha (/home/tb-intern1/Desktop/repo/borislav.a-training/src/services/authService.js:313:16)
      at processTicksAndRejections (internal/process/task_queues.js:95:5)`;
  
      await logger.createIssue(errorObject);
  
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = global.fetch.mock.calls[0];
      const options = fetchCall[1];
      const body = JSON.parse(options.body);
  
      expect(body.error.fileName).toEqual("authService.js");
      expect(body.error.lineNumber).toEqual("313");
    });
  
    it("should call logger.error if an error occurs during processing", async () => {
      const errorObject = new Error("Missing stack");
      errorObject.stack = ""; // This will fail the ASSERT calls in createIssue

      jest.spyOn(logger, "error").mockResolvedValue();
  
      await logger.createIssue(errorObject);
      
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
