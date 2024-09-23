const AppConfigService = require("../appConfigService");

describe("AppConfigService", () => {
  let appConfigService;
  let mockDbConnection;

  beforeEach(() => {
    // Initialize the service
    appConfigService = new AppConfigService();

    // Mock the dbConnection object
    mockDbConnection = {
      query: jest.fn(),
    };
  });

  describe("updateRateLimitSettings", () => {
    it("should update the rate limit settings and return a success message", async () => {
      const data = {
        body: {
          request_limit: 1000,
          request_window: 60,
          request_block_duration: 15,
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
          },
        ],
      });

      const result = await appConfigService.updateRateLimitSettings(data);

      const expectedQuery = `
        UPDATE app_settings 
        SET request_limit = $1, request_window = $2, request_block_duration = $3
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
        SET request_limit = $1, request_window = $2, request_block_duration = $3
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

      const result = await appConfigService.getRateLimitSettings(data);

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

      await expect(appConfigService.getRateLimitSettings(data)).rejects.toThrow(
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
});

function containsQueryString(actualQuery, expectedQuery) {
  const normalize = (str) => str.trim().replace(/\s+/g, " ");
  return normalize(actualQuery).includes(normalize(expectedQuery));
}
