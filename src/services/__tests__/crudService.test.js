const CrudService = require("../crudService");
const bcrypt = require("bcrypt");

describe("CrudService", () => {
  let crudService;
  let mockDbConnection;
  let mockEntitySchemaCollection;
  let req;

  beforeEach(() => {
    mockDbConnection = {
      query: jest.fn(),
    };

    mockEntitySchemaCollection = {
      testEntity: {
        name: "products",
        views: "products_view",
        table: "products",
        properties: {
          name: { type: "string" },
          price: { type: "numeric" },
          short_description: { type: "string" },
          long_description: { type: "string" },
        },
      },
    };

    req = {
      params: { entity: "testEntity", id: "1" },
      body: {
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
        categories: JSON.stringify([1, 2]),
        imagesToDelete: JSON.stringify([]), // Add empty array as default
      },
      query: {
        searchParams: {},
        filterParams: {},
        orderParams: [],
        page: "1",
        pageSize: "10",
      },
      dbConnection: mockDbConnection,
      entitySchemaCollection: mockEntitySchemaCollection,
    };

    crudService = new CrudService();
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed_password");
  });

  afterEach(() => {
    jest.clearAllMocks(); // Reset mocks after each test
  });

  describe("create", () => {
    it("should create a new product and return the result", async () => {
      const expectedResponse = {
        id: 1,
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      };
      mockDbConnection.query.mockResolvedValue({ rows: [expectedResponse] });

      const result = await crudService.create(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "INSERT INTO products(name,price,short_description,long_description) VALUES($1,$2,$3,$4) RETURNING *",
        ["Test Product", 100.5, "Short description", "Long description"]
      );
      expect(result).toEqual(expectedResponse);
    });

    it("should hash the password if password_hash is provided", async () => {
      req.body = {
        first_name: "John",
        last_name: "Doe",
        password_hash: "plain_password",
      };
      mockEntitySchemaCollection.testEntity = {
        name: "users",
        views: "users_view",
        table: "users",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          password_hash: { type: "string" },
        },
      };

      mockDbConnection.query.mockResolvedValue({
        rows: [{ id: 1, name: "Test Product" }],
      });

      const result = await crudService.create(req);

      expect(bcrypt.hash).toHaveBeenCalledWith("plain_password", 10);
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "INSERT INTO users(first_name,last_name,password_hash) VALUES($1,$2,$3) RETURNING *",
        ["John", "Doe", "hashed_password"]
      );
    });

    it("should throw an error if required fields are missing", async () => {
      req.body = { price: 50.0 }; // Missing required fields: name, short_description, long_description

      await expect(crudService.create(req)).rejects.toThrow();
    });
  });

  describe("getFilteredPaginated", () => {
    it("should fetch filtered and paginated results with total count", async () => {
      const expectedResponse = [
        { id: 1, name: "Item 1", category: "Category 1" },
        { id: 2, name: "Item 2", category: "Category 2" },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ total_rows: "2", groupCount: undefined }] }) // Mock the count query
        .mockResolvedValueOnce({ rows: expectedResponse }); // Mock the result query

      const result = await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) AS total_rows FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual({
        result: expectedResponse,
        count: "2",
        groupCount: undefined,
        aggregationResults : { total_rows: "2", groupCount: undefined }
      });
    });

    it("should return empty array with count if no items match the criteria", async () => {
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ total_rows: "0", groupCount: undefined }] }) // Mock the count query
        .mockResolvedValueOnce({ rows: [] }); // Mock the result query

      const result = await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) AS total_rows FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual({
        result: [],
        count: "0",
        groupCount: undefined,
        aggregationResults : { total_rows: "0", groupCount: undefined }
      });
    });

    it("should handle array filters correctly (e.g., categories)", async () => {
      // Simulate a case where 'categories' filter is an array
      req.query.filterParams = { categories: [1, 2, 3] };

      const expectedResponse = [
        { id: 1, name: "Product 1", categories: [1, 2] },
        { id: 2, name: "Product 2", categories: [2, 3] },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ total_rows: "2", groupCount: undefined }] }) // Mock the count query
        .mockResolvedValueOnce({ rows: expectedResponse }); // Mock the result query

      const result = await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(CAST(categories AS text)) = LOWER($1)"),
        expect.arrayContaining([1, 2, 3])
      );

      expect(result).toEqual({
        result: expectedResponse,
        count: "2",
        groupCount: undefined,
        aggregationResults : { total_rows: "2", groupCount: undefined }
      });
    });

    it("should apply partial match filter for string fields (e.g., email contains 'gmail.com')", async () => {
      req.query.filterParams = { email: "gmail.com" }; // Filter for email containing "gmail.com"

      const expectedResponse = [
        { id: 1, name: "John Doe", email: "john@gmail.com" },
        { id: 2, name: "Jane Doe", email: "jane@gmail.com" },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ total_rows: "2", groupCount: undefined}] }) // Mock the count query
        .mockResolvedValueOnce({ rows: expectedResponse }); // Mock the result query

      const result = await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "STRPOS(LOWER(CAST(email AS text)), LOWER($1)) > 0"
        ),
        expect.arrayContaining(["gmail.com"])
      );

      expect(result).toEqual({
        result: expectedResponse,
        count: "2",
        groupCount: undefined,
        aggregationResults : { total_rows: "2", groupCount: undefined }
      });
    });

    it("should apply exact match filter for numeric fields (e.g., ID)", async () => {
      req.query.filterParams = { id: 5 }; // Exact match for ID

      const expectedResponse = [
        { id: 5, name: "John Doe", email: "john.doe@example.com" },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ total_rows: "1", groupCount: undefined}] }) // Mock the count query
        .mockResolvedValueOnce({ rows: expectedResponse }); // Mock the result query

      const result = await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("id = $1"),
        expect.arrayContaining([5])
      );

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
        groupCount: undefined,
        aggregationResults : { total_rows: "1", groupCount: undefined }
      });
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(crudService.getFilteredPaginated(req)).rejects.toThrow(
        "Database error"
      );
    });

    it("should apply correct sorting order", async () => {
      req.query.orderParams = [["name", "DESC"]];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY name DESC"),
        expect.any(Array)
      );
    });

    it("should handle pagination correctly", async () => {
      req.query.page = "2";
      req.query.pageSize = "5";

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT $"),
        expect.any(Array)
      );
    });

    it("should use default empty object for searchParams if not provided", async () => {
      req.query.searchParams = {};

      const expectedResponse = [
        { id: 1, name: "Test Item", category: "Category 1" },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ total_rows: "1", groupCount: undefined }] })
        .mockResolvedValueOnce({ rows: expectedResponse });

      const result = await crudService.getFilteredPaginated(req);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
        groupCount: undefined,
        aggregationResults : { total_rows: "1", groupCount: undefined }
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default pageSize of 10 if not provided", async () => {
      req.query.pageSize = undefined;

      const expectedResponse = [
        { id: 1, name: "Test Item", category: "Category 1" },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ total_rows: "1", groupCount: undefined}] })
        .mockResolvedValueOnce({ rows: expectedResponse });

      const result = await crudService.getFilteredPaginated(req);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
        groupCount: undefined,
        aggregationResults : { total_rows: "1", groupCount: undefined }
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should apply only max price filter when price.min is not provided", async () => {
      req.query.filterParams = { price: { max: 150 } };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price <= $"),
        expect.any(Array)
      );
    });

    it("should apply only min price filter when price.max is not provided", async () => {
      req.query.filterParams = { price: { min: 50 } };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price >= $"),
        expect.any(Array)
      );
    });

    it("should apply correct query with empty filterParams", async () => {
      req.query.filterParams = {};
      req.query.searchParams = {};
      req.query.orderParams = [];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await crudService.getFilteredPaginated(req);

      expect(mockDbConnection.query).not.toHaveBeenCalledWith(
        expect.stringContaining("WHERE "),
        expect.any(Array)
      );
    });
  });

  describe('buildFilteredPaginatedQuery', () => {
    let mockRequest;
    
    beforeEach(() => {
      mockRequest = {
        params: { entity: 'testEntity' },
        query: {
          filterParams: {},
          orderParams: [],
          groupParams: [],
          page: 1,
          pageSize: 10
        },
        entitySchemaCollection: {
          testEntity: {
            views: 'test_view',
            export_view: 'test_export_view',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              created_at: { 
                type: 'string',
                format: 'date-time',
                groupable: true,
                aggregation: 'DATE_TRUNC'
              },
              price: { 
                type: 'number',
                group_behavior: 'SUM'
              },
              status: { type: 'string' },
              birthday: {
                type: 'string',
                format: 'date-time-no-year'
              },
              start_date: {
                type: 'string',
                format: 'date-range-overlap-start'
              },
              end_date: {
                type: 'string',
                format: 'date-range-overlap-end'
              }
            }
          }
        }
      };
    });
  
    it('should build basic query without filters or grouping', () => {
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('SELECT *');
      expect(result.query).toContain('FROM test_view');
      expect(result.query).toContain('ORDER BY id ASC');
      expect(result.searchValues).toHaveLength(0);
    });
  
    it('should build query with string filter', () => {
      mockRequest.query.filterParams = { name: 'test' };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('WHERE STRPOS(LOWER(CAST(name AS text)), LOWER($1)) > 0');
      expect(result.searchValues).toEqual(['test']);
    });
  
    it('should build query with array filter', () => {
      mockRequest.query.filterParams = { status: ['active', 'pending'] };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('WHERE (LOWER(CAST(status AS text)) = LOWER($1) OR LOWER(CAST(status AS text)) = LOWER($2))');
      expect(result.searchValues).toEqual(['active', 'pending']);
    });
  
    it('should build query with date-time filter range', () => {
      mockRequest.query.filterParams = {
        created_at: {
          min: '2024-01-01',
          max: '2024-12-31'
        }
      };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('WHERE created_at >= $1');
      expect(result.query).toContain('created_at <= $2'); 
      expect(result.searchValues).toEqual(['2024-01-01', '2024-12-31']);
    });

    it('should build query with date-time filter range with only min', () => {
      mockRequest.query.filterParams = {
        created_at: {
          min: '2024-01-01'
        }
      };

      const result = crudService.buildFilteredPaginatedQuery(mockRequest);

      expect(result.query).toContain('WHERE created_at >= $1');
      expect(result.searchValues).toEqual(['2024-01-01']);
    });

    it('should build query with date-time filter range with only max', () => {
      mockRequest.query.filterParams = {
        created_at: {
          max: '2024-12-31'
        }
      };

      const result = crudService.buildFilteredPaginatedQuery(mockRequest);

      expect(result.query).toContain('WHERE created_at <= $1');
      expect(result.searchValues).toEqual(['2024-12-31']);
    });

    it('should build query with date-time filter with exact match', () => {
      mockRequest.query.filterParams = { created_at: '2024-12-25' };

      const result = crudService.buildFilteredPaginatedQuery(mockRequest);

      expect(result.query).toContain('WHERE created_at = $1');
      expect(result.searchValues).toEqual(['2024-12-25']);
    });
  
    it('should build query with date-time-no-year filter', () => {
      mockRequest.query.filterParams = { birthday: '2024-12-25' };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('(EXTRACT(MONTH FROM birthday), EXTRACT(DAY FROM birthday))');
      expect(result.searchValues).toEqual(['2024-12-25']);
    });
  
    it('should build query with date range overlap', () => {
      mockRequest.query.filterParams = {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('$1 <= end_date');
      expect(result.query).toContain('start_date <= $2');
      expect(result.searchValues).toEqual(['2024-01-01', '2024-12-31']);
    });
  
    it('should build query with numeric range filter', () => {
      mockRequest.query.filterParams = {
        price: { min: 10, max: 100 }
      };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('WHERE price >= $1 AND price <= $2');
      expect(result.searchValues).toEqual([10, 100]);
    });
  
    it('should build query with grouping', () => {
      mockRequest.query.groupParams = [
        { column: 'created_at', granularity: 'month' }
      ];
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain("DATE_TRUNC('month', created_at)");
      expect(result.query).toContain('GROUP BY GROUPING SETS');
      expect(result.query).toContain('COUNT(*) AS count');
    });
  
    it('should build query with ordering', () => {
      mockRequest.query.orderParams = [['name', 'desc']];
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('ORDER BY name DESC');
    });
  
    it('should build query with multiple filters', () => {
      mockRequest.query.filterParams = {
        name: 'test',
        status: 'active',
        price: { min: 10 }
      };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.query).toContain('WHERE');
      expect(result.query).toContain('AND');
      expect(result.searchValues).toHaveLength(3);
    });
  
    it('should build export query when isExport is true', () => {
      const result = crudService.buildFilteredPaginatedQuery(mockRequest, true);
  
      expect(result.query).toContain('FROM test_export_view');
    });
  
    it('should build aggregated total query with group behavior', () => {
      mockRequest.query.groupParams = [
        { column: 'created_at', granularity: 'month' }
      ];
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.aggregatedTotalQuery).toContain('SUM(price) AS total_price');
      expect(result.aggregatedTotalQuery).toContain('COUNT(*) AS total_rows');
    });
  
    it('should handle empty filter values', () => {
      mockRequest.query.filterParams = {
        name: '',
      };
  
      const result = crudService.buildFilteredPaginatedQuery(mockRequest);
  
      expect(result.searchValues).toHaveLength(1);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      mockEntitySchemaCollection = {
        users: {
          name: "users",
          views: "users_view",
          table: "users",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            password_hash: { type: "string" },
          },
          relationships: {
            sessions: {
              table: "sessions",
              foreign_key: "user_id",
            },
          },
        },
      };
    });

    it("should update the entity and hash password if provided", async () => {
      const req = {
        entitySchemaCollection: mockEntitySchemaCollection,
        params: { entity: "users", id: 1 },
        body: {
          first_name: "John",
          last_name: "Doe",
          password_hash: "plainpassword",
        },
        dbConnection: mockDbConnection,
      };

      const hashedPassword = "hashedpassword";
      bcrypt.hash = jest.fn().mockResolvedValue(hashedPassword);

      mockDbConnection.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            password_hash: hashedPassword,
          },
        ],
      });

      const result = await crudService.update(req);

      expect(bcrypt.hash).toHaveBeenCalledWith("plainpassword", 10);
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE users SET first_name = $1, last_name = $2, password_hash = $3 WHERE id = $4 RETURNING *"
        ),
        ["John", "Doe", hashedPassword, 1]
      );
      expect(result).toEqual({
        id: 1,
        first_name: "John",
        last_name: "Doe",
        password_hash: hashedPassword,
      });
    });

    it("should update the entity without updating the password if not provided", async () => {
      const req = {
        entitySchemaCollection: mockEntitySchemaCollection,
        params: { entity: "users", id: 1 },
        body: { first_name: "John", last_name: "Doe" },
        dbConnection: mockDbConnection,
      };

      mockDbConnection.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            password_hash: "existinghashedpassword",
          },
        ],
      });

      const result = await crudService.update(req);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING *"
        ),
        ["John", "Doe", 1]
      );
      expect(result).toEqual({
        id: 1,
        first_name: "John",
        last_name: "Doe",
        password_hash: "existinghashedpassword",
      });
    });
  });

  describe("getById", () => {
    it("should return the product by ID", async () => {
      const expectedResponse = {
        id: 1,
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      };
      mockDbConnection.query.mockResolvedValueOnce({
        rows: [expectedResponse],
      });

      const result = await crudService.getById(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view WHERE id = $1",
        ["1"]
      );
      expect(result).toEqual(expectedResponse);
    });

    it("should return null if product does not exist", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] });

      const result = await crudService.getById(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view WHERE id = $1",
        ["1"]
      );
      expect(result).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all products", async () => {
      const expectedResponse = [
        {
          id: 1,
          name: "Test Product 1",
          price: 100.5,
          short_description: "Short description 1",
          long_description: "Long description 1",
        },
        {
          id: 2,
          name: "Test Product 2",
          price: 200.75,
          short_description: "Short description 2",
          long_description: "Long description 2",
        },
      ];
      mockDbConnection.query.mockResolvedValueOnce({ rows: expectedResponse });

      const result = await crudService.getAll(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view"
      );
      expect(result).toEqual(expectedResponse);
    });

    it("should return an empty array if no products exist", async () => {
      mockDbConnection.query.mockResolvedValueOnce({ rows: [] });

      const result = await crudService.getAll(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view"
      );
      expect(result).toEqual([]);
    });
  });

  describe("delete", () => {
    it("should delete user and its relationships", async () => {
      crudService.deleteRelationships = jest.fn().mockResolvedValue();

      mockDbConnection.query.mockResolvedValueOnce({
        rows: [{ id: 1, first_name: "John" }], // Mock user deletion
      });

      const result = await crudService.delete(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(`UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING *`,
        ["1"]
      );

      expect(result).toEqual({ id: 1, first_name: "John" });
    });
  });

  describe("deleteRelationships", () => {
    it("should do nothing if there are no relationships defined", async () => {
      const data = {
        dbConnection: mockDbConnection,
        entitySchemaCollection: {},
      };
      const schema = { relationships: undefined }; // No relationships

      await crudService.deleteRelationships(data, schema, 1);

      expect(mockDbConnection.query).not.toHaveBeenCalled(); // Ensure no query is called
    });

    it("should delete nested relationships first", async () => {
      const nestedRelationshipSchema = {
        relationships: {
          sessions: {
            table: "sessions",
            foreign_key: "user_id",
            nested_relationships: {
              captchas: {
                table: "captchas",
                foreign_key: "session_id",
              },
              failed_attempts: {
                table: "failed_attempts",
                foreign_key: "session_id",
              },
            },
          },
          email_verifications: {
            table: "email_verifications",
            foreign_key: "user_id",
          },
          comments: {
            table: "comments",
            foreign_key: "user_id",
          },
          ratings: {
            table: "ratings",
            foreign_key: "user_id",
          },
        },
      };
    
      const data = {
        dbConnection: mockDbConnection,
      };
    
      // Mock the related entity IDs for the top-level relationships (e.g., sessions)
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ id: 2 }, { id: 3 }] }) // Mock return for sessions
        .mockResolvedValueOnce({ rows: [] }) // No sessions related to id 3
        .mockResolvedValueOnce({ rows: [{ id: 4 }, { id: 5 }] }) // Mock return for captchas
        .mockResolvedValueOnce({ rows: [{ id: 4 }] }); // Mock return for failed_attempts
    
      // Call the deleteRelationships method
      await crudService.deleteRelationships(data, nestedRelationshipSchema, 1);
    
      // Verify that the correct queries were executed
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `SELECT id FROM sessions WHERE user_id = $1`,
        [1]
      );
    
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `DELETE FROM captchas WHERE session_id = $1`,
        [2]
      );
    
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `DELETE FROM failed_attempts WHERE session_id = $1`,
        [2]
      );
    
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `DELETE FROM email_verifications WHERE user_id = $1`,
        [1]
      );
    
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `DELETE FROM comments WHERE user_id = $1`,
        [1]
      );
    
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `DELETE FROM ratings WHERE user_id = $1`,
        [1]
      );
    });

    it("should delete top-level relationships", async () => {
      const topLevelRelationshipSchema = {
        relationships: {
          relationship_one: {
            table: "relationship_one_table",
            foreign_key: "user_id",
          },
          relationship_two: {
            table: "relationship_two_table",
            foreign_key: "user_id",
          },
        },
      };

      const data = {
        dbConnection: mockDbConnection,
      };

      // Mock the deletion of top-level relationships
      await crudService.deleteRelationships(
        data,
        topLevelRelationshipSchema,
        1
      );

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `DELETE FROM relationship_one_table WHERE user_id = $1`,
        [1]
      );
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        `DELETE FROM relationship_two_table WHERE user_id = $1`,
        [1]
      );
    });
  });

  describe('campaignCreateHook', () => {
    let mockData;
    let currentDate;
  
    beforeEach(() => {
      currentDate = new Date('2024-01-01T00:00:00Z');
      jest.useFakeTimers().setSystemTime(currentDate);
  
      mockData = {
        body: {
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-31T00:00:00Z',
          voucher_id: 1
        },
        dbConnection: {
          query: jest.fn()
        }
      };
    });
  
    afterEach(() => {
      jest.useRealTimers();
    });
  
    it('should set status to Active for current campaign', async () => {
      const mockVoucher = {
        id: 1,
        is_active: true,
        end_date: new Date('2024-02-01T00:00:00Z')
      };
      
      mockData.dbConnection.query.mockResolvedValueOnce({
        rows: [mockVoucher]
      });
  
      await crudService.campainCreateHook(mockData);
  
      expect(mockData.body.status).toBe('Active');
      expect(mockData.dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM vouchers'),
        [1]
      );
    });
  
    it('should set status to Pending for future campaign', async () => {
      mockData.body.start_date = '2024-01-15T00:00:00Z';
      mockData.body.end_date = '2024-01-31T00:00:00Z';
  
      const mockVoucher = {
        id: 1,
        is_active: true,
        end_date: new Date('2024-02-01T00:00:00Z')
      };
      
      mockData.dbConnection.query.mockResolvedValueOnce({
        rows: [mockVoucher]
      });
  
      await crudService.campainCreateHook(mockData);
  
      expect(mockData.body.status).toBe('Pending');
    });
  
    it('should set status to Expired voucher when voucher end date is passed', async () => {
      const mockVoucher = {
        id: 1,
        is_active: true,
        end_date: new Date('2023-12-31T23:59:59Z')
      };
      
      mockData.dbConnection.query.mockResolvedValueOnce({
        rows: [mockVoucher]
      });
  
      await crudService.campainCreateHook(mockData);
  
      expect(mockData.body.status).toBe('Expired voucher');
    });
  
    it('should throw error when start date is after end date', async () => {
      mockData.body.start_date = '2024-01-31T00:00:00Z';
      mockData.body.end_date = '2024-01-01T00:00:00Z';
  
      await expect(crudService.campainCreateHook(mockData))
        .rejects
        .toThrow('Start date must be before end date');
    });
  
    it('should throw error when end date is in the past', async () => {
      mockData.body.start_date = '2023-12-01T00:00:00Z';
      mockData.body.end_date = '2023-12-31T00:00:00Z';
  
      await expect(crudService.campainCreateHook(mockData))
        .rejects
        .toThrow('End date must be in the future');
    });
  
    it('should throw error when there is no active voucher', async () => {
      mockData.dbConnection.query.mockResolvedValueOnce({
        rows: []
      });
  
      await expect(crudService.campainCreateHook(mockData))
        .rejects
        .toThrow('Voucher is not active');
    });
  
    it('should throw error when voucher does not exist', async () => {
      mockData.dbConnection.query.mockResolvedValueOnce({
        rows: []
      });
  
      await expect(crudService.campainCreateHook(mockData))
        .rejects
        .toThrow('Voucher is not active');
    });
  
    it('should set status to Pending if date is before campaign start date', async () => {
      mockData.body.start_date = '2024-02-01T00:00:00Z';
      mockData.body.end_date = '2024-02-28T00:00:00Z';
  
      const mockVoucher = {
        id: 1,
        is_active: true,
        end_date: new Date('2024-03-01T00:00:00Z')
      };
      
      mockData.dbConnection.query.mockResolvedValueOnce({
        rows: [mockVoucher]
      });
  
      await crudService.campainCreateHook(mockData);
  
      expect(mockData.body.status).toBe('Pending');
    });
  });

  describe('adminUsersUpdateHook', () => {
    let mockData;
    let mockInsertObject;
    
    beforeEach(() => {
      mockData = {
        params: { id: 1 },
        body: {
          role_id: [2, 3] // New roles to be assigned
        },
        dbConnection: {
          query: jest.fn()
        },
        logger: {
          info: jest.fn()
        }
      };
  
      mockInsertObject = {
        keys: ['username', 'role_id', 'email']
      };
    });
  
    it('should handle role updates correctly', async () => {
      // Mock current roles (to be deleted)
      mockData.dbConnection.query
        .mockResolvedValueOnce({
          rows: [
            { role_id: 1, role_name: 'Admin' },
            { role_id: 2, role_name: 'Editor' }
          ]
        })
        // Mock new role insertions
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        // Mock added roles lookup
        .mockResolvedValueOnce({
          rows: [
            { role_id: 3, role_name: 'Viewer' }
          ]
        });
  
      await crudService.adminUsersUpdateHook(mockData, mockInsertObject);
  
      // Verify DELETE query
      expect(mockData.dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM admin_user_roles'),
        [1]
      );
  
      // Verify INSERT queries
      expect(mockData.dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_user_roles'),
        [1, 2]
      );
      expect(mockData.dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_user_roles'),
        [1, 3]
      );
  
      // Verify role_id was removed from insertObject
      expect(mockInsertObject.keys).not.toContain('role_id');
  
      // Verify logging
      expect(mockData.logger.info).toHaveBeenCalledWith({
        code: "SERVICE.CRUD.00507.ROLE_CHANGE_SUCCESS",
        short_description: expect.stringContaining('User roles updated for user with ID: 1'),
        long_description: expect.stringContaining('Added roles: Viewer; Removed roles: Admin')
      });
    });
  
    it('should handle empty new roles list', async () => {
      mockData.body.role_id = [];
  
      mockData.dbConnection.query
        .mockResolvedValueOnce({
          rows: [
            { role_id: 1, role_name: 'Admin' },
            { role_id: 2, role_name: 'Editor' }
          ]
        })
        .mockResolvedValueOnce({ rows: [] });
  
      await crudService.adminUsersUpdateHook(mockData, mockInsertObject);
  
      // Verify only DELETE was called
      expect(mockData.dbConnection.query).toHaveBeenCalledTimes(2);
      expect(mockData.logger.info).toHaveBeenCalledWith({
        code: "SERVICE.CRUD.00507.ROLE_CHANGE_SUCCESS",
        short_description: expect.stringContaining('User roles updated for user with ID: 1'),
        long_description: expect.stringContaining('Added roles: ; Removed roles: Admin, Editor')
      });
    });
  
    it('should handle no existing roles', async () => {
      mockData.dbConnection.query
        .mockResolvedValueOnce({ rows: [] }) // No current roles
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({
          rows: [
            { role_id: 2, role_name: 'Editor' },
            { role_id: 3, role_name: 'Viewer' }
          ]
        });
  
      await crudService.adminUsersUpdateHook(mockData, mockInsertObject);
  
      // Verify INSERT queries were called
      expect(mockData.dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_user_roles'),
        expect.any(Array)
      );
  
      expect(mockData.logger.info).toHaveBeenCalledWith({
        code: "SERVICE.CRUD.00507.ROLE_CHANGE_SUCCESS"
,
        short_description: expect.stringContaining('User roles updated for user with ID: 1'),
        long_description: expect.stringContaining('Added roles: Editor, Viewer; Removed roles: ')
      });
    });
  
    it('should handle no changes in roles', async () => {
      mockData.body.role_id = [1, 2];
      
      mockData.dbConnection.query
        .mockResolvedValueOnce({
          rows: [
            { role_id: 1, role_name: 'Admin' },
            { role_id: 2, role_name: 'Editor' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [] }); // No new roles added
  
      await crudService.adminUsersUpdateHook(mockData, mockInsertObject);
  
      expect(mockData.logger.info).toHaveBeenCalledWith({
        code: "SERVICE.CRUD.00507.ROLE_CHANGE_SUCCESS"
,
        short_description: expect.stringContaining('User roles updated for user with ID: 1'),
        long_description: expect.stringContaining('Added roles: ; Removed roles: ')
      });
    });
  
    it('should handle database errors gracefully', async () => {
      mockData.dbConnection.query.mockRejectedValueOnce(new Error('Database error'));
  
      await expect(crudService.adminUsersUpdateHook(mockData, mockInsertObject))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('roleUpdateHook', () => {
    let mockData;
    let mockInsertObject;
  
    beforeEach(() => {
      mockData = {
        params: { id: 1 },
        body: {
          permissions: [
            { interface_id: 1, action: 'create', allowed: true },
            { interface_id: 2, action: 'read', allowed: true },
            { interface_id: 1, action: 'delete', allowed: false }
          ]
        },
        dbConnection: {
          query: jest.fn()
        },
        logger: {
          info: jest.fn()
        }
      };
  
      mockInsertObject = {
        keys: ['name', 'role_permissions', 'description']
      };
    });
  
    it('should handle permission updates correctly', async () => {
      // Mock current permissions query
      mockData.dbConnection.query
        .mockResolvedValueOnce({
          rows: [
            { permission_id: 1, interface_id: 2, action: 'read', interface: 'users' },
            { permission_id: 2, interface_id: 1, action: 'delete', interface: 'users' }
          ]
        })
        // Mock permission insertions
        .mockResolvedValueOnce({
          rows: [{ permission_id: 3, action: 'create', interface: 'users' }]
        })
        // Mock permission deletions
        .mockResolvedValueOnce({
          rows: [{ permission_id: 2, action: 'delete', interface: 'users' }]
        });
  
      await crudService.roleUpdateHook(mockData, mockInsertObject);
  
      // Verify queries were called
      expect(mockData.dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT role_permissions.permission_id'),
        [1]
      );
  
      expect(mockInsertObject.keys).not.toContain('role_permissions');
  
      expect(mockData.logger.info).toHaveBeenCalledWith({
        code: "SERVICE.CRUD.00583.PERMISSION_CHANGE_SUCCESS",
        short_description: expect.stringContaining('Permissions updated for role with ID: 1'),
        long_description: expect.stringContaining('Added permissions: create - users; Removed permissions: delete - users')
      });
    });
  
    it('should handle adding new permissions to role without existing permissions', async () => {
      // Mock empty current permissions
      mockData.dbConnection.query
        .mockResolvedValueOnce({ rows: [] })
        // Mock permission insertions
        .mockResolvedValueOnce({
          rows: [{ permission_id: 1, action: 'create', interface: 'users' }]
        })
        .mockResolvedValueOnce({
          rows: [{ permission_id: 2, action: 'read', interface: 'users' }]
        });
  
      await crudService.roleUpdateHook(mockData, mockInsertObject);
  
      expect(mockData.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          long_description: expect.stringContaining('Added permissions: create - users, read - users; Removed permissions: ')
        })
      );
    });
  
    it('should handle no permission changes', async () => {
      mockData.body.permissions = [
        { interface_id: 1, action: 'read', allowed: true }
      ];
  
      mockData.dbConnection.query
        .mockResolvedValueOnce({
          rows: [
            { permission_id: 1, interface_id: 1, action: 'read', interface: 'users' }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }) // No permissions added
        .mockResolvedValueOnce({ rows: [] }); // No permissions removed
  
      await crudService.roleUpdateHook(mockData, mockInsertObject);
  
      expect(mockData.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          long_description: expect.stringContaining('Added permissions: ; Removed permissions: ')
        })
      );
    });
  
    it('should handle database errors gracefully', async () => {
      mockData.dbConnection.query.mockRejectedValueOnce(new Error('Database error'));
  
      await expect(crudService.roleUpdateHook(mockData, mockInsertObject))
        .rejects
        .toThrow('Database error');
    });
  
    it('should filter out non-allowed permissions', async () => {
      mockData.body.permissions = [
        { interface_id: 1, action: 'create', allowed: false },
        { interface_id: 2, action: 'read', allowed: true }
      ];
  
      mockData.dbConnection.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ permission_id: 2, action: 'read', interface: 'products' }]
        });
  
      await crudService.roleUpdateHook(mockData, mockInsertObject);
  
      // Verify only allowed permissions were processed
      expect(mockData.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          long_description: expect.stringContaining('Added permissions: read - products; Removed permissions: ')
        })
      );
    });
  });

  describe('targetGroupCreateHook', () => {
    let mockData;
    let mockMainEntity;

    beforeEach(() => {
        mockData = {
            params: { entity: 'testEntity' },
            body: {
                users: {
                    query: {
                        searchParams: {},
                        filterParams: { email: 'test@test.com' }
                    }
                }
            },
            dbConnection: {
                query: jest.fn()
            }
        };

        mockMainEntity = {
            id: 123
        };

        crudService.buildFilteredPaginatedQuery = jest.fn().mockReturnValue({
            query: 'SELECT * FROM users_view WHERE email LIKE $1',
            searchValues: ['%test@test.com%']
        });
    });

    it('should create target group associations correctly', async () => {
        mockDbConnection.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        await crudService.targetGroupCreateHook(mockData, mockMainEntity);
        expect(crudService.buildFilteredPaginatedQuery).toHaveBeenCalledTimes(1);
    });

    describe('emailTemplateUpdateHook', () => {
      let mockData;
      let mockInsertObject;
  
      beforeEach(() => {
          mockData = {
              params: { id: '1' },
              body: {},
              dbConnection: {
                  query: jest.fn()
              }
          };
          mockInsertObject = {};
      });
  
      it('should update email template with stringified placeholders', async () => {
          const mockTemplate = {
              id: 1,
              placeholders: ['placeholder1', 'placeholder2']
          };
          
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: [mockTemplate]
          });
  
          await crudService.emailTemplateUpdateHook(mockData, mockInsertObject);
  
          expect(mockData.dbConnection.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT * FROM message_templates'),
              [mockData.params.id]
          );
          expect(mockData.body.placeholders).toBe(JSON.stringify(mockTemplate.placeholders));
      });
  
      it('should throw error when template not found', async () => {
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: []
          });
  
          await expect(crudService.emailTemplateUpdateHook(mockData, mockInsertObject))
              .rejects
              .toThrow('Email template not found');
  
          expect(mockData.dbConnection.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT * FROM message_templates'),
              [mockData.params.id]
          );
      });
  
      it('should handle null placeholders', async () => {
          const mockTemplate = {
              id: 1,
              placeholders: null
          };
          
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: [mockTemplate]
          });
  
          await crudService.emailTemplateUpdateHook(mockData, mockInsertObject);
  
          expect(mockData.body.placeholders).toBe('null');
      });
    });

    describe('notificationCreateHook', () => {
      let mockData;
      let mockMainEntity;
  
      beforeEach(() => {
          mockData = {
              dbConnection: {
                  query: jest.fn()
              }
          };
  
          mockMainEntity = {
              id: 1,
              template_id: 123,
              user_ids: '1,2,3'
          };
      });
  
      it('should create notifications for all users successfully', async () => {
          // Mock template query
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: [{
                  id: 123,
                  subject: 'Test Subject',
                  template: 'Hello {first_name} {last_name}!',
                  placeholders: ['{first_name}', '{last_name}']
              }]
          });
  
          // Mock users query
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: [
                  { id: 1, email: 'user1@test.com', first_name: 'John', last_name: 'Doe' },
                  { id: 2, email: 'user2@test.com', first_name: 'Jane', last_name: 'Smith' }
              ]
          });
  
          // Mock email insertions
          mockData.dbConnection.query.mockResolvedValue({ rows: [{ id: 1 }] });
  
          await crudService.notificationCreateHook(mockData, mockMainEntity);
  
          // Verify template query
          expect(mockData.dbConnection.query).toHaveBeenNthCalledWith(1,
              expect.stringContaining('SELECT * FROM message_templates'),
              [123]
          );
  
          // Verify users query
          expect(mockData.dbConnection.query).toHaveBeenNthCalledWith(2,
              expect.stringContaining('SELECT DISTINCT users.id, email, first_name, last_name, phone' ),
              [[1, 2, 3]]
          );
  
          // Verify email insertions
          expect(mockData.dbConnection.query).toHaveBeenNthCalledWith(3,
              expect.stringContaining('INSERT INTO message_queue'),
              [1, 'user1@test.com', 'Test Subject', 'Hello John Doe!', 1]
          );
      });
  
      it('should throw error when template not found', async () => {
          mockData.dbConnection.query.mockResolvedValueOnce({ rows: [] });
  
          await expect(crudService.notificationCreateHook(mockData, mockMainEntity))
              .rejects
              .toThrow('Template not found');
      });
  
      it('should throw error when user data missing placeholder values', async () => {
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: [{
                  id: 123,
                  subject: 'Test Subject',
                  template: 'Hello {first_name}!',
                  placeholders: ['{first_name}']
              }]
          });
  
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: [
                  { id: 1, email: 'user1@test.com', first_name: null }
              ]
          });
  
          await expect(crudService.notificationCreateHook(mockData, mockMainEntity))
              .rejects
              .toThrow('Missing email template placeholder');
      });
  
      it('should handle empty user_ids', async () => {
          mockMainEntity.user_ids = '';
  
          mockData.dbConnection.query.mockResolvedValueOnce({
              rows: [{
                  id: 123,
                  subject: 'Test Subject',
                  template: 'Hello {first_name}!',
                  placeholders: ['{first_name}']
              }]
          });
  
          mockData.dbConnection.query.mockResolvedValueOnce({ rows: [] });
          
          await expect(crudService.notificationCreateHook(mockData, mockMainEntity))
              .rejects
              .toThrow('No users found');
  
          expect(mockData.dbConnection.query).toHaveBeenCalledTimes(2);
      });
    });
  });
});
