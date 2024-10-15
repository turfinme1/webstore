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
      expect(result).toEqual([expectedResponse]);
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
        expect.stringContaining("categories IN ($1, $2, $3)"),
        expect.arrayContaining([1, 2, 3])
      );

      expect(result).toEqual({
        result: expectedResponse,
        count: "2",
        groupCount: undefined,
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

  describe("update", () => {
    beforeEach(() => {
      mockEntitySchemaCollection = {
        users: {
          name: "users",
          views: "users_view",
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

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "DELETE FROM products WHERE id = $1 RETURNING *",
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
});
