const { Readable } = require("nodemailer/lib/xoauth2");
const AuthService = require("../authService");
const bcrypt = require("bcrypt");
const { fa } = require("@faker-js/faker");
const { ENV } = require("../../serverConfigurations/constants");

describe("AuthService", () => {
  let authService;
  let mockMailService;
  let mockDbConnection;
  let data;

  beforeEach(() => {
    // Mock dependencies
    mockMailService = {
      sendVerificationEmail: jest.fn(),
      queueEmail: jest.fn(),
    };

    mockDbConnection = {
      query: jest.fn(),
    };

    authService = new AuthService(mockMailService);

    // Data structure passed to the AuthService methods
    data = {
      dbConnection: mockDbConnection,
      body: {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      },
      entitySchemaCollection: {
        userManagementSchema: {
          user_id: "user_id",
          user_table: "users",
          session_table: "sessions",
          captcha_table: "captchas",
          failed_attempts_table: "failed_attempts",
          session_id: "session_id",
        },
        userAuthSchema: {
          routeName: "users",
          properties: {
            email: {},
            password: {},
            name: {},
          },
        },
      },
      session: {
        session_hash: "session123",
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a user and send a verification email", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      const mockSession = { session_hash: "session123", user_id: 1 };
      authService.verifyCaptcha = jest.fn().mockResolvedValueOnce(true);

      // Mock bcrypt hashing
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedPassword");

      // Mock database queries
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // New user created
        .mockResolvedValueOnce({ rows: [{ token_hash: "token123" }] }) // Verification token created
        .mockResolvedValueOnce({ rows: [mockSession] }); // Session created

      const result = await authService.register(data);

      // Assertions
      expect(mockDbConnection.query).toHaveBeenCalledTimes(3);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockMailService.queueEmail).toHaveBeenCalledWith({
        dbConnection: mockDbConnection,
        emailData: {
          address: `<a href="${ENV.DEVELOPMENT_URL}/auth/verify-mail?token=token123">Verify Email</a>`,
          first_name: undefined,
          last_name: undefined,
          recipient: "test@example.com",
          templateType: "Email verification",
        },
      });
      expect(result).toEqual(mockSession);
    });

    it("should convert undefined values to null", async () => {
      authService.verifyCaptcha = jest.fn().mockResolvedValueOnce(true);
      data.body.name = undefined;
      const mockUser = { id: 1, email: "test@example.com" };
      const mockSession = { session_hash: "session123", user_id: 1 };

      const mockHashedPassword = "hashed_password";
      bcrypt.hash.mockResolvedValue(mockHashedPassword);

      mockDbConnection.query
        // .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ rows: [mockUser] }) // New user created
        .mockResolvedValueOnce({ rows: [{ token_hash: "token123" }] }) // Verification token created
        .mockResolvedValueOnce({ rows: [mockSession] }); // Session created

      // Act
      await authService.register(data);

      // Assert
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        [
          "test@example.com",
          mockHashedPassword,
          null, // This should correspond to the undefined value for someField
        ]
      );
    });
  });

  describe("login", () => {
    it("should log in a user and return a session", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        password_hash: "hashedPassword",
        is_email_verified: true,
      };
      const mockSession = { session_hash: "session123", user_id: 1 };
      authService.verifyCaptcha = jest.fn().mockResolvedValueOnce(true);

      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // User found
        .mockResolvedValueOnce({ rows: [mockSession] }) // Session updated
        .mockResolvedValueOnce({ rows: [] }); // Insert into user_logins 

      const result = await authService.login(data);

      expect(mockDbConnection.query).toHaveBeenCalledTimes(3);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedPassword"
      );
      expect(result).toEqual(mockSession);
    });

    it("should throw an error if login credentials are incorrect", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] }); // No user found
      authService.verifyCaptcha = jest.fn().mockResolvedValueOnce(true);

      await expect(authService.login(data)).rejects.toThrow("Invalid login");
    });
  });

  describe("logout", () => {
    it("should log out the user by deactivating the session", async () => {
      mockDbConnection.query.mockResolvedValueOnce({
        rows: [{ session_hash: "session123" }],
      });

      const result = await authService.logout(data);

      expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
      expect(result.session_hash).toBe("session123");
    });

    it("should throw an error for an invalid session", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] }); // No session found

      await expect(authService.logout(data)).rejects.toThrow("Invalid session");
    });
  });

  describe("verifyMail", () => {
    it("should verify user email and update session", async () => {
      const mockVerificationInfo = {
        user_id: 1,
        expires_at: new Date(Date.now() + 10000),
        is_email_verified: false,
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockVerificationInfo] }) // Token found
        .mockResolvedValueOnce({ rows: [{}] }) // Email verified
        .mockResolvedValueOnce({ rows: [{}] }) // Token deactivated
        .mockResolvedValueOnce({ rows: [{}] }); // Session updated

      const result = await authService.verifyMail({
        ...data,
        query: { token: "token123" },
      });

      expect(mockDbConnection.query).toHaveBeenCalledTimes(4);
      expect(result).toEqual({ message: "Email successfully verified" });
    });

    it("should throw an error for an invalid token", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] }); // Token not found

      await expect(
        authService.verifyMail({ ...data, query: { token: "token123" } })
      ).rejects.toThrow("Invalid or expired token");
    });
  });

  describe("createSession", () => {
    it("should create a session and return it", async () => {
      const mockSession = {
        id: 1,
        user_id: 1,
        ip_address: "127.0.0.1",
        session_type_id: 1,
      };
      const data = {
        dbConnection: mockDbConnection,
        userId: 1,
        ipAddress: "127.0.0.1",
        sessionType: "authenticated",
        sessionHash: "session123",
        entitySchemaCollection: {
          userManagementSchema: {
            user_id: "user_id",
            user_table: "users",
            session_table: "sessions",
            captcha_table: "captchas",
            failed_attempts_table: "failed_attempts",
            session_id: "session_id",
          },
        },
      };

      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await authService.createSession(data);

      const expectedQuery = `
          INSERT INTO sessions (user_id,ip_address,session_type_id) 
          VALUES ($1, $2, (SELECT id FROM session_types WHERE type = $3 LIMIT 1)) 
          RETURNING *`;
      const actualQuery = mockDbConnection.query.mock.calls[0][0];

      expect(containsQueryString(actualQuery, expectedQuery)).toBe(true);
      expect(result).toEqual(mockSession);
    });
  });

  describe("getSession", () => {
    it("should return a session if found and active", async () => {
      const mockSession = { session_hash: "session123", is_active: true };

      // Mock database query
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await authService.getSession(data);
      const expectedQuery = `
          SELECT * FROM sessions WHERE session_hash = $1 AND is_active = TRUE`;
      const actualQuery = mockDbConnection.query.mock.calls[0][0];

      // Assertions
      expect(containsQueryString(actualQuery, expectedQuery)).toBe(true);
      expect(result).toEqual(mockSession);
    });

    it("should return null if no active session is found", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] });

      const result = await authService.getSession(data);

      const expectedQuery = `
          SELECT * FROM sessions WHERE session_hash = $1 AND is_active = TRUE`;
      const actualQuery = mockDbConnection.query.mock.calls[0][0];

      expect(containsQueryString(actualQuery, expectedQuery)).toBe(true);
      expect(result).toBeUndefined();
    });
  });

  describe("refreshSessionExpiry", () => {
    it("should update the session expiry and return the session", async () => {
      const mockSession = {
        session_hash: "session123",
        expires_at: new Date(),
      };

      // Mock database query
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await authService.refreshSessionExpiry(data);

      const expectedQuery = `
          UPDATE sessions SET expires_at = NOW() + INTERVAL '40 minutes' WHERE session_hash = $1 RETURNING *`;

      const actualQuery = mockDbConnection.query.mock.calls[0][0];

      // Assertions
      expect(containsQueryString(actualQuery, expectedQuery)).toBe(true);
      expect(result).toEqual(mockSession);
    });

    it("should throw an error if session does not exist", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.refreshSessionExpiry(data)).rejects.toThrow(
        "Invalid session"
      );
    });
  });

  describe("getStatus", () => {
    it("should retrieve user status when session is valid", async () => {
      const mockStatus = {
        email: "test@example.com",
        name: "Test User",
        phone: "1234567890",
        session_type: "authenticated",
      };

      // Mock database query result
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockStatus] });

      const result = await authService.getStatus(data);

      // Expected query
      const expectedQuery = `
        SELECT u.first_name, u.last_name, u.email, u.iso_country_code_id, u.phone, u.gender_id, u.birth_date, u.country_id, u.address, u.has_first_login, st.type as session_type
        FROM sessions s
        JOIN session_types st ON s.session_type_id = st.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.session_hash = $1`;

      // Capture the actual query called in the function
      const actualQuery = mockDbConnection.query.mock.calls[0][0];

      // Assertions
      expect(containsQueryString(actualQuery, expectedQuery)).toBe(true);
      expect(result).toEqual(mockStatus);
    });

    it("should change has_first_login to true if it is false", async () => {
      const mockStatus = {
        email: "test@example.com",
        name: "Test User",
        phone: "1234567890",
        session_type: "authenticated",
        has_first_login: false,
      };

      // Mock database query result
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockStatus] });

      const result = await authService.getStatus(data);

      // Expected query
      const expectedQuery = `
        SELECT u.first_name, u.last_name, u.email, u.iso_country_code_id, u.phone, u.gender_id, u.birth_date, u.country_id, u.address, u.has_first_login, st.type as session_type
        FROM sessions s
        JOIN session_types st ON s.session_type_id = st.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.session_hash = $1`;
      
      const expectedUpdateQuery = `
        UPDATE users u SET has_first_login = TRUE WHERE u.id = $1`;
      
      // Capture the actual query called in the function
      const actualQuery = mockDbConnection.query.mock.calls[0][0];
      const updateQuery = mockDbConnection.query.mock.calls[1][0];
      // Assertions
      expect(containsQueryString(actualQuery, expectedQuery)).toBe(true);
      expect(containsQueryString(updateQuery, expectedUpdateQuery)).toBe(true);
    });

    it("should throw an error if session is invalid", async () => {
      // Mock query result with no rows (invalid session)
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.getStatus(data)).rejects.toThrow(
        "Invalid session"
      );

      // Ensure the query was still called
      const expectedQuery = `
        SELECT u.first_name, u.last_name, u.email, u.iso_country_code_id, u.phone, u.gender_id, u.birth_date, u.country_id, u.address, u.has_first_login, st.type as session_type
        FROM sessions s
        JOIN session_types st ON s.session_type_id = st.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.session_hash = $1`;

      const actualQuery = mockDbConnection.query.mock.calls[0][0];
      expect(containsQueryString(actualQuery, expectedQuery)).toBe(true);
    });
  });

  describe("getCaptcha", () => {
    it("should generate a CAPTCHA image and return it", async () => {
      const mockCaptcha = { session_id: 1, equation: "5+3", answer: 8 };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockCaptcha] }) // Captcha inserted
        .mockResolvedValueOnce({ rows: [] }); // Previous captchas deactivated

      const result = await authService.getCaptcha(data);

      expect(result).toBeInstanceOf(Readable);
      expect(mockDbConnection.query).toHaveBeenCalledTimes(2);
    });

    it("should generate a CAPTCHA with addition and correct answer", async () => {
      const number1 = 3;
      const number2 = 5;
      const operator = "+";
      const captchaAnswer = number1 + number2;
      const expectedUpdateQuery = `
        UPDATE captchas SET is_active = FALSE WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1) RETURNING *`;
      const expectedInsertQuery = `
        INSERT INTO captchas (session_id, equation, answer) 
        VALUES ((SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1), $2, $3) RETURNING *`;

      // Mocking random number to always choose '+'
      jest.spyOn(Math, "random").mockReturnValue(0.4); // Ensures operator is '+'

      const mockCaptcha = {
        session_id: 1,
        equation: `${number1}${operator}${number2}`,
        answer: captchaAnswer,
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockCaptcha] }) // Captcha inserted
        .mockResolvedValueOnce({ rows: [] }); // Previous captchas deactivated

      await authService.getCaptcha(data);

      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedUpdateQuery
        )
      ).toBe(true);
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[1][0],
          expectedInsertQuery
        )
      ).toBe(true);
    });

    it("should generate a CAPTCHA with subtraction and correct answer", async () => {
      const number1 = 10;
      const number2 = 7;
      const operator = "-";
      const captchaAnswer = number1 - number2;
      const expectedUpdateQuery = `
        UPDATE captchas SET is_active = FALSE WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1) RETURNING *`;
      const expectedInsertQuery = `
        INSERT INTO captchas (session_id, equation, answer) 
        VALUES ((SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1), $2, $3) RETURNING *`;

      // Mocking random number to always choose '-'
      jest.spyOn(Math, "random").mockReturnValue(0.6); // Ensures operator is '-'

      const mockCaptcha = {
        session_id: 1,
        equation: `${number1}${operator}${number2}`,
        answer: captchaAnswer,
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockCaptcha] }) // Captcha inserted
        .mockResolvedValueOnce({ rows: [] }); // Previous captchas deactivated

      await authService.getCaptcha(data);

      // Assert that the CAPTCHA answer and equation are as expected
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedUpdateQuery
        )
      ).toBe(true);
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[1][0],
          expectedInsertQuery
        )
      ).toBe(true);
    });
  });

  describe("verifyCaptcha", () => {
    beforeEach(() => {
      data.body = { captcha_answer: "8" };
      data.session = { session_hash: "test-session-hash" };
    });

    it("should verify the captcha and deactivate it when the answer is correct", async () => {
      const mockAppSettings = {
        request_limit: "5",
        request_window: "1 hour",
        request_block_duration: "30 minutes",
      };
      const mockFailedAttempts = { failed_attempts_count: "2" }; // Under the threshold
      const mockCaptcha = {
        id: 1,
        answer: "8",
        is_active: true,
        expires_at: new Date(Date.now() + 60000),
      };

      // Mock queries for app settings, failed attempts, captcha, and updating the captcha
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockAppSettings] }) // App settings
        .mockResolvedValueOnce({ rows: [mockFailedAttempts] }) // Failed attempts
        .mockResolvedValueOnce({ rows: [mockCaptcha] }) // Captcha found
        .mockResolvedValueOnce({ rows: [] }); // Update captcha to inactive

      await authService.verifyCaptcha(data);

      const expectedAppSettingsQuery = `
        SELECT request_limit, request_window, request_block_duration
        FROM app_settings LIMIT 1`;

      const expectedFailedAttemptsQuery = `
        SELECT COUNT(*) AS failed_attempts_count
        FROM failed_attempts
        WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1)
        AND attempt_type_id = (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1)
        AND created_at >= NOW() - (SELECT request_window FROM app_settings LIMIT 1)`;

      const expectedCaptchaQuery = `
        SELECT * FROM captchas
        WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1) 
        AND is_active = TRUE AND expires_at > NOW()`;

      // Assertions for the database queries
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedAppSettingsQuery
        )
      ).toBe(true);
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[1][0],
          expectedFailedAttemptsQuery
        )
      ).toBe(true);
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[2][0],
          expectedCaptchaQuery
        )
      ).toBe(true);
      expect(mockDbConnection.query).toHaveBeenCalledTimes(4); // Including app settings query
    });

    it("should throw an error when there are too many failed attempts", async () => {
      const mockAppSettings = {
        request_limit: "5", // The limit set in app settings
        request_window: "1 hour",
        request_block_duration: "30 minutes",
      };
      const mockFailedAttempts = { failed_attempts_count: "6" }; // Over the threshold

      // Mock query results for app settings and failed attempts
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockAppSettings] }) // App settings
        .mockResolvedValueOnce({ rows: [mockFailedAttempts] }); // Failed attempts

      // Mocking the update for rate limiting
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] }); // For rate limiting

      await expect(authService.verifyCaptcha(data)).rejects.toThrow(
        "Too many failed attempts. Try again later"
      );

      const expectedFailedAttemptsQuery = `
        SELECT COUNT(*) AS failed_attempts_count
        FROM failed_attempts
        WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1)
        AND attempt_type_id = (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1)
        AND created_at >= NOW() - (SELECT request_window FROM app_settings LIMIT 1)`;

      const expectedRateLimitUpdateQuery = `
        UPDATE sessions
        SET rate_limited_until = NOW() + (SELECT request_block_duration FROM app_settings LIMIT 1)
        WHERE session_hash = $1`;

      // Ensure the correct query was made for failed attempts
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[1][0],
          expectedFailedAttemptsQuery
        )
      ).toBe(true);

      // Ensure the rate limiting update query was called
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[2][0],
          expectedRateLimitUpdateQuery
        )
      ).toBe(true);

      // Ensure no further steps were taken after the rate limiting
      expect(mockDbConnection.query).toHaveBeenCalledTimes(4);
    });

    it("should throw an error when the captcha answer is incorrect", async () => {
      const mockAppSettings = {
        request_limit: "5", // The limit set in app settings
        request_window: "1 hour",
        request_block_duration: "30 minutes",
      };
      const mockFailedAttempts = { failed_attempts_count: "2" }; // Under the threshold
      const mockCaptcha = {
        id: 1,
        answer: "9", // Incorrect answer compared to the test input
        is_active: true,
        expires_at: new Date(Date.now() + 60000),
      };

      // Mock queries for failed attempts, captcha, inserting failed attempt, and invalidating captcha
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockAppSettings] }) // App settings
        .mockResolvedValueOnce({ rows: [mockFailedAttempts] }) // Failed attempts count
        .mockResolvedValueOnce({ rows: [mockCaptcha] }) // Captcha details
        .mockResolvedValueOnce({ rows: [] }) // Insert into failed_attempts
        .mockResolvedValueOnce({ rows: [] }) // Update captcha to inactive
        .mockResolvedValueOnce({ rows: [] }); // Commit transaction (optional)

      // The test should reject with an error for invalid captcha
      await expect(authService.verifyCaptcha(data)).rejects.toThrow(
        "Invalid captcha answer"
      );

      const expectedFailedAttemptsQuery = `
        SELECT COUNT(*) AS failed_attempts_count
        FROM failed_attempts
        WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1)
        AND attempt_type_id = (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1)
        AND created_at >= NOW() - (SELECT request_window FROM app_settings LIMIT 1)`;

      const expectedCaptchaQuery = `
        SELECT * FROM captchas
        WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1) 
        AND is_active = TRUE AND expires_at > NOW()`;

      const expectedCaptchaInvalidationQuery = `
        UPDATE captchas SET is_active = FALSE WHERE id = $1`;

      const expectedInsertFailedAttemptQuery = `
        INSERT INTO failed_attempts (session_id, attempt_type_id)
        VALUES ((SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1),
        (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1))`;

      // Verify the queries executed
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[1][0],
          expectedFailedAttemptsQuery
        )
      ).toBe(true);
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[2][0],
          expectedCaptchaQuery
        )
      ).toBe(true);
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[3][0],
          expectedCaptchaInvalidationQuery
        )
      ).toBe(true);
      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[4][0],
          expectedInsertFailedAttemptQuery
        )
      ).toBe(true);

      // Ensure the number of queries is correct (app settings, failed attempts, captcha, failed attempt insert, captcha invalidation)
      expect(mockDbConnection.query).toHaveBeenCalledTimes(6); // 5 queries + commit
    });
  });

  describe("updateProfile", () => {
    it("should update the user profile and return the updated user", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        password_hash: "oldHashedPassword", // Old password hash
      };
      data.body.old_password = "oldPassword123"; // Old password

      // Mock fetching the user
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Mock bcrypt comparison for old password validation
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      // Mock bcrypt hashing for new password
      jest.spyOn(bcrypt, "hash").mockResolvedValue("newHashedPassword");

      // Mock the query for updating the user profile
      const updatedUser = {
        id: 1,
        email: "test@example.com",
        name: "Updated User",
        password_hash: "newHashedPassword",
      };
      mockDbConnection.query.mockResolvedValueOnce({ rows: [updatedUser] });

      // Call the updateProfile method
      const result = await authService.updateProfile(data);

      // Verify the calls
      expect(mockDbConnection.query).toHaveBeenCalledTimes(2); // One for SELECT, one for UPDATE
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "oldPassword123",
        "oldHashedPassword"
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);

      // Verify the result
      expect(result).toEqual(updatedUser);
    });

    it("should not update if no changes are detected", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        password_hash: "oldHashedPassword",
      };
      data.body.old_password = "oldPassword123"; // Old password

      // Mock fetching the user
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Mock bcrypt comparison for old password validation
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      // No password change in this case
      data.body.password = undefined; // No new password provided
      data.body.name = "Test User"; // No name change either

      // Call the updateProfile method
      await expect(authService.updateProfile(data)).rejects.toThrow(
        "No changes to update"
      );

      // Verify only the SELECT query was called
      expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "oldPassword123",
        "oldHashedPassword"
      );
    });

    it("should throw an error if the old password is incorrect", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        password_hash: "oldHashedPassword",
      };
      data.body.old_password = "oldPassword123"; // Old password

      // Mock fetching the user
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Mock bcrypt comparison for old password validation (incorrect password)
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

      // Call the updateProfile method and expect it to throw an error
      await expect(authService.updateProfile(data)).rejects.toThrow(
        "Old password is incorrect"
      );

      // Verify only the SELECT query was called
      expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "oldPassword123",
        "oldHashedPassword"
      );
    });

    it("should update the profile without changing the password", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        password_hash: "oldHashedPassword",
      };

      // Mock fetching the user
      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Mock bcrypt comparison for old password validation
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      // No password change in this case
      data.body.old_password = "oldPassword123"; // No new password provided
      data.body.name = "Updated User"; // Name is changing

      // Mock the query for updating the user profile
      const updatedUser = {
        id: 1,
        email: "test@example.com",
        name: "Updated User",
        password_hash: "oldHashedPassword", // Password remains unchanged
      };
      mockDbConnection.query.mockResolvedValueOnce({ rows: [updatedUser] });

      // Call the updateProfile method
      const result = await authService.updateProfile(data);

      // Verify the calls
      expect(mockDbConnection.query).toHaveBeenCalledTimes(2); // One for SELECT, one for UPDATE
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "oldPassword123",
        "oldHashedPassword"
      );

      // Verify the result
      expect(result).toEqual(updatedUser);
    });
  });

  describe("forgotPassword", () => {
    it("should send a password reset email if the email exists", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      const mockResetToken = { token_hash: "resetToken123" };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // User found
        .mockResolvedValueOnce({ rows: [] }) // No active verification
        .mockResolvedValueOnce({ rows: [] }) //Email verification created
        .mockResolvedValueOnce({ rows: [mockResetToken] }); // Reset token created

      const result = await authService.forgotPassword(data);

      expect(mockDbConnection.query).toHaveBeenCalledTimes(4);
      expect(mockMailService.queueEmail).toHaveBeenCalledWith({
        dbConnection: mockDbConnection,
        emailData: {
          address: `<a href="${ENV.DEVELOPMENT_URL}/reset-password?token=resetToken123">Reset Password</a>`,
          recipient: "test@example.com",
          templateType: "Forgot password",
        },
      });
      expect(result.message).toBe(
        "If the email exists, a password reset link will be sent"
      );
    });

    it("should return a message if the email does not exist", async () => {
      data.body.email = "nonexistent@example.com";
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] }); // No user found

      const result = await authService.forgotPassword(data);

      expect(result.message).toBe(
        "If the email exists, a password reset link will be sent"
      );
    });
  });

  describe("resetPassword", () => {
    it("should reset the user's password if the reset token is valid", async () => {
      const mockUser = { id: 1, expires_at: new Date(Date.now() + 10000) }; // Token is valid
      jest.spyOn(bcrypt, "hash").mockResolvedValue("newHashedPassword");

      mockDbConnection.query.mockResolvedValueOnce({ rows: [mockUser] }); // Valid token found

      const result = await authService.resetPassword({
        ...data,
        query: { token: "validToken123" },
      });

      expect(mockDbConnection.query).toHaveBeenCalledTimes(3);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(result.message).toBe("Password successfully reset");
    });

    it("should throw an error for an invalid or expired token", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] }); // Invalid token

      await expect(
        authService.resetPassword({
          ...data,
          query: { token: "invalidToken" },
        })
      ).rejects.toThrow("Invalid or expired token");
    });

    describe("requirePermission", () => {
      it("should allow action if the user has the required permission", () => {
        const req = {
          session: {
            role_permissions: [
              { permission: "read", interface: "user" },
              { permission: "write", interface: "admin" },
            ],
          },
        };
        const permission = "read";
        const interfaceName = "user";

        expect(() => authService.requirePermission(req, permission, interfaceName)).not.toThrow();
      });

      it("should throw an error if the user does not have the required permission", () => {
        const req = {
          session: {
            role_permissions: [
              { permission: "read", interface: "user" },
              { permission: "write", interface: "admin" },
            ],
          },
        };
        const permission = "delete";
        const interfaceName = "user";

        expect(() => authService.requirePermission(req, permission, interfaceName)).toThrow("You do not have permission to perform this action");
      });

      it("should throw an error if the user does not have the required interface", () => {
        const req = {
          session: {
            role_permissions: [
              { permission: "read", interface: "user" },
              { permission: "write", interface: "admin" },
            ],
          },
        };
        const permission = "read";
        const interfaceName = "admin";

        expect(() => authService.requirePermission(req, permission, interfaceName)).toThrow("You do not have permission to perform this action");
      });
    });
  });
});

function containsQueryString(actualQuery, expectedQuery) {
  const normalize = (str) => str.trim().replace(/\s+/g, " ");
  return normalize(actualQuery).includes(normalize(expectedQuery));
}
