const AppConfigService = require("../appConfigService");

describe("AppConfigService", () => {
  let appConfigService;
  let mockDbConnection;
  let mockDb;

  beforeEach(() => {
    // Initialize the service
    appConfigService = new AppConfigService();

    // Mock the dbConnection object
    mockDbConnection = {
      query: jest.fn(),
    };
    mockDb = { query: jest.fn() };
    jest.clearAllMocks();
  });

  describe("updateRateLimitSettings", () => {
    it("should update the rate limit settings and return a success message", async () => {
      const data = {
        body: {
          request_limit: 1000,
          request_window: 60,
          request_block_duration: 15,
          password_require_digit: true,
          password_require_lowercase: false,
          password_require_uppercase: false,
          password_require_special: false,
          vat_percentage: 20,
        },
        dbConnection: mockDbConnection,
      };

      // Mock the database response
      mockDbConnection.query.mockResolvedValueOnce({
        rows: [
          {
            request_limit: 1000,
            request_window: 60,
            request_block_duration: 15,
            password_require_digit: true,
            password_require_lowercase: false,
            password_require_uppercase: false,
            password_require_special: false,
            vat_percentage: 20,
          },
        ],
      });

      const result = await appConfigService.updateRateLimitSettings(data);

      const expectedQuery = `
        UPDATE app_settings 
        SET request_limit = $1, request_window = $2, request_block_duration = $3, password_require_digit = $4, password_require_lowercase = $5, password_require_uppercase = $6, password_require_special = $7, vat_percentage = $8, report_row_limit_display = $9, campaign_status_update_interval = $10, target_group_status_update_interval = $11, target_group_status_update_initial_time = $12, user_group_chart_count = $13, campaign_chart_count = $14, push_notification_provider_id = $15
        WHERE id = 1 RETURNING *`;

      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedQuery
        )
      ).toBe(true);

      expect(result).toEqual({ message: "Rate limit settings updated" });
    });

    it("should update the rate limit settings with default values and return a success message", async () => {
      const data = {
        body: {
          request_limit: 1000,
          request_window: 60,
          request_block_duration: 15,
          password_require_digit: "",
          password_require_lowercase: false,
          password_require_uppercase: false,
          password_require_special: false,
          vat_percentage: "",
        },
        dbConnection: mockDbConnection,
      };

      // Mock the database response
      mockDbConnection.query.mockResolvedValueOnce({
        rows: [
          {
            request_limit: 1000,
            request_window: 60,
            request_block_duration: 15,
            password_require_digit: false,
            password_require_lowercase: false,
            password_require_uppercase: false,
            password_require_special: false,
            vat_percentage: 0,
          },
        ],
      });

      const result = await appConfigService.updateRateLimitSettings(data);

      const expectedQuery = `
        UPDATE app_settings 
        SET request_limit = $1, request_window = $2, request_block_duration = $3, password_require_digit = $4, password_require_lowercase = $5, password_require_uppercase = $6, password_require_special = $7, vat_percentage = $8, report_row_limit_display = $9, campaign_status_update_interval = $10, target_group_status_update_interval = $11, target_group_status_update_initial_time = $12, user_group_chart_count = $13, campaign_chart_count = $14, push_notification_provider_id = $15
        WHERE id = 1 RETURNING *`;

      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedQuery
        )
      ).toBe(true);

      expect(result).toEqual({ message: "Rate limit settings updated" });
    });

    it("should throw an error if the database query fails", async () => {
      const data = {
        body: {
          request_limit: 1000,
          request_window: 60,
          request_block_duration: 15,
          password_require_digit: true,
          password_require_lowercase: false,
          password_require_uppercase: false,
          password_require_special: false,
          vat_percentage: 20,
        },
        dbConnection: mockDbConnection,
      };

      // Mock a database error
      mockDbConnection.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        appConfigService.updateRateLimitSettings(data)
      ).rejects.toThrow("Database error");

      const expectedQuery = `
        UPDATE app_settings 
        SET request_limit = $1, request_window = $2, request_block_duration = $3, password_require_digit = $4, password_require_lowercase = $5, password_require_uppercase = $6, password_require_special = $7, vat_percentage = $8, report_row_limit_display = $9, campaign_status_update_interval = $10, target_group_status_update_interval = $11, target_group_status_update_initial_time = $12, user_group_chart_count = $13, campaign_chart_count = $14, push_notification_provider_id = $15
        WHERE id = 1 RETURNING *`;

      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedQuery
        )
      ).toBe(true);
    });
  });

  describe("getRateLimitSettings", () => {
    it("should fetch the rate limit settings", async () => {
      const data = {
        dbConnection: mockDbConnection,
      };

      const mockRateLimitSettings = {
        request_limit: 1000,
        request_window: 60,
        request_block_duration: 15,
      };

      // Mock the database response
      mockDbConnection.query.mockResolvedValueOnce({
        rows: [mockRateLimitSettings],
      });

      const result = await appConfigService.getSettings(data);

      const expectedQuery = `
        SELECT * FROM app_settings WHERE id = 1`;

      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedQuery
        )
      ).toBe(true);
      expect(result).toEqual(mockRateLimitSettings);
    });

    it("should throw an error if the database query fails", async () => {
      const data = {
        dbConnection: mockDbConnection,
      };

      // Mock a database error
      mockDbConnection.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(appConfigService.getSettings(data)).rejects.toThrow(
        "Database error"
      );

      const expectedQuery = `
        SELECT * FROM app_settings WHERE id = 1`;

      expect(
        containsQueryString(
          mockDbConnection.query.mock.calls[0][0],
          expectedQuery
        )
      ).toBe(true);
    });
  });

  describe("getPublicSettings", () => {
    it("should query the push provider join and return the first row", async () => {
      const fakeRow = {
        push_notification_provider_id: 7,
        push_notification_provider_name: "firebase",
      };
      mockDb.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await appConfigService.getPublicSettings({ dbConnection: mockDb });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT push_notification_provider_id, push_notification_providers.name AS push_notification_provider_name"
        )
      );
      expect(result).toEqual(fakeRow);
    });

    it("should bubble up DB errors", async () => {
      mockDb.query.mockRejectedValue(new Error("db fail"));

      await expect(
        appConfigService.getPublicSettings({ dbConnection: mockDb })
      ).rejects.toThrow("db fail");
    });
  });

});

function containsQueryString(actualQuery, expectedQuery) {
  const normalize = (str) => str.trim().replace(/\s+/g, " ");
  return normalize(actualQuery).includes(normalize(expectedQuery));
}
