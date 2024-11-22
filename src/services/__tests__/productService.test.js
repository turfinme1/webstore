const ProductService = require("../productService");

describe("ProductService", () => {
  let productService;
  let mockDbConnection;
  let mockEntitySchemaCollection;
  let params;
  let req;

  beforeEach(() => {
    mockDbConnection = {
      query: jest.fn(),
    };

    mockEntitySchemaCollection = {
      products: {
        name: "products",
        views: "products_view",
        displayProperties: {
          name: { searchable: true },
          price: { searchable: false },
          short_description: { searchable: true },
          long_description: { searchable: true },
        },
        properties: {
          name: { type: "string" },
          price: { type: "numeric" },
          short_description: { type: "string" },
          long_description: { type: "string" },
        },
      },
    };

    productService = new ProductService();

    params = {
      query: {
        searchParams: {
          keyword: "test",
          categories: ["Electronics", "Books"],
        },
        filterParams: {
          categories: ["Electronics", "Books"],
          price: { min: 50, max: 150 },
        },
        orderParams: [["price", "ASC"]],
        page: "1",
        pageSize: "10",
      },
      session: {
        user_id: 1,
      },
      params: {
        id: 1,
      },
      body: {
        comment: "Great product!",
        rating: 5,
      },
      dbConnection: mockDbConnection,
      entitySchemaCollection: mockEntitySchemaCollection,
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
      dbConnection: mockDbConnection,
      entitySchemaCollection: mockEntitySchemaCollection,
    };

    jest.spyOn(productService, 'handleFileUploads').mockResolvedValue(['/images/dummy.jpg']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getFilteredPaginated", () => {
    it("should fetch filtered and paginated products with total count", async () => {
      const expectedResponse = [
        { id: 1, name: "Test Product 1", price: 100, categories: ["Electronics"] },
        { id: 2, name: "Test Product 2", price: 150, categories: ["Books"] },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "2" }] }) // Mock the count query
        .mockResolvedValueOnce({ rows: expectedResponse }) // Mock the result query
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      const result = await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual({
        result: expectedResponse,
        count: "2", // Ensure count is returned correctly (it's likely to be a string because SQL COUNT returns string type)
      });
    });

    it("should return an empty array with count if no products match the criteria", async () => {
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // Mock the count query
        .mockResolvedValueOnce({ rows: [] }) // Mock the result query
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      const result = await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual({
        result: [],
        count: "0",
      });
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(productService.getFilteredPaginated(params)).rejects.toThrow("Database error");
    });

    it("should apply correct search filters", async () => {
      params.query.searchParams = {
        keyword: "test",
        price: { min: 100, max: 200 },
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price >= $"),
        expect.any(Array)
      );
    });

    it("should apply correct sorting order", async () => {
      params.query.orderParams = [["name", "DESC"]];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY name DESC"),
        expect.any(Array)
      );
    });

    it("should handle pagination correctly", async () => {
      params.query.page = "2";
      params.query.pageSize = "5";

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT $"),
        expect.any(Array)
      );
    });

    // Additional tests for ternary operator branches and defaults

    it("should use default empty object for searchParams if not provided", async () => {
      params.query.searchParams = {};

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default empty object for filterParams if not provided", async () => {
      params.query.filterParams = {};

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default empty array for orderParams if not provided", async () => {
      params.query.orderParams = [];

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default pageSize of 10 if not provided", async () => {
      params.query.pageSize = undefined;

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1"}] })
        .mockResolvedValueOnce({ rows: expectedResponse })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default page of 1 if not provided", async () => {
      params.query.page = undefined;

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should apply only max price filter when price.min is not provided", async () => {
      params.query.filterParams = {
        price: { max: 150 },
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0"}] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price <= $"),
        expect.any(Array)
      );
    });

    it("should apply only min price filter when price.max is not provided", async () => {
      params.query.filterParams = {
        price: { min: 50 },
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price >= $"),
        expect.any(Array)
      );
    });

    it("should apply correct query with empty filterParams", async () => {
      params.query.filterParams = {};
      params.query.searchParams = {};
      params.query.orderParams = [];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{vat_percentage: 20}] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).not.toHaveBeenCalledWith(
        expect.stringContaining("WHERE "),
        expect.any(Array)
      );
    });
  });

  describe("createComment", () => {
    it("should create or update a comment and return the inserted/updated comment", async () => {
      const expectedComment = {
        product_id: 1,
        user_id: 1,
        comment: "Great product!",
      };

      mockDbConnection.query.mockResolvedValueOnce({
        rows: [expectedComment],
      });

      const result = await productService.createComment(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO comments"),
        [params.params.id, params.session.user_id, params.body.comment]
      );

      expect(result).toEqual(expectedComment);
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(productService.createComment(params)).rejects.toThrow("Database error");
    });
  });

  describe("createRating", () => {
    it("should create or update a rating and return the inserted/updated rating", async () => {
      const expectedRating = {
        product_id: 1,
        user_id: 1,
        rating: 5,
      };

      mockDbConnection.query.mockResolvedValueOnce({
        rows: [expectedRating],
      });

      const result = await productService.createRating(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO ratings"),
        [params.params.id, params.session.user_id, params.body.rating]
      );

      expect(result).toEqual(expectedRating);
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(productService.createRating(params)).rejects.toThrow("Database error");
    });
  });

  describe("getComments", () => {
    it("should return all comments for a product", async () => {
      const expectedComments = [
        { id: 1, product_id: 1, comment: "Great product!" },
        { id: 2, product_id: 1, comment: "Good value for money" },
      ];

      mockDbConnection.query.mockResolvedValueOnce({
        rows: expectedComments,
      });

      const result = await productService.getComments(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM comments_view"),
        [params.params.id]
      );

      expect(result).toEqual(expectedComments);
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(productService.getComments(params)).rejects.toThrow("Database error");
    });
  });

  describe("getRatings", () => {
    it("should return the ratings for a product", async () => {
      const expectedRatings = [
        { id: 1, product_id: 1, average_rating: 4.5, rating_count: 2 },
      ];

      mockDbConnection.query.mockResolvedValueOnce({
        rows: expectedRatings,
      });

      const result = await productService.getRatings(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM product_ratings_view"),
        [params.params.id]
      );

      expect(result).toEqual(expectedRatings);
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(productService.getRatings(params)).rejects.toThrow("Database error");
    });
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
      mockDbConnection.query.mockResolvedValueOnce({ rows: [expectedResponse] });

      const result = await productService.create(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "INSERT INTO products(name,price,short_description,long_description) VALUES($1,$2,$3,$4) RETURNING *",
        ["Test Product", 100.5, "Short description", "Long description"]
      );

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO products_categories"), 
        [1, 1, 2]
      );

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO images"), 
        [1, '/images/dummy.jpg']
      );

      expect(result).toEqual(expectedResponse);
    });

    it("should throw an error if required fields are missing", async () => {
      req.body = { price: 50.0 }; // Missing required fields: name, short_description, long_description

      await expect(productService.create(req)).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update the product and return the updated result", async () => {
      const expectedResponse = {
        id: 1,
        name: "Updated Product",
        price: 150.0,
        short_description: "Updated short description",
        long_description: "Updated long description",
      };

      req.body = {
        name: "Updated Product",
        price: 150.0,
        short_description: "Updated short description",
        long_description: "Updated long description",
        categories: [1, 2],
        imagesToDelete: JSON.stringify([]),
      };

      mockDbConnection.query.mockResolvedValueOnce({ rows: [expectedResponse] });

      const result = await productService.update(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "UPDATE products SET name = $1, price = $2, short_description = $3, long_description = $4 WHERE id = $5 RETURNING *",
        [
          "Updated Product",
          150.0,
          "Updated short description",
          "Updated long description",
          "1",
        ]
      );

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO products_categories"), 
        [1, 1, 2]
      );

      // expect(mockDbConnection.query).toHaveBeenCalledWith(
      //   expect.stringContaining("INSERT INTO images"), 
      //   [1, '/images/dummy.jpg']
      // );

      expect(result).toEqual(expectedResponse);
    });
  });

  describe("delete", () => {
    it("should delete the product and return the deleted entity", async () => {
      const expectedResponse = {
        id: 1,
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      };

      mockDbConnection.query.mockResolvedValueOnce({ rows: [expectedResponse] });

      const result = await productService.delete(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "DELETE FROM products WHERE id = $1 RETURNING *",
        ["1"]
      );
      expect(result).toEqual(expectedResponse);
    });

    describe("delete", () => {
      it("should delete the product and return the deleted entity", async () => {
        const expectedResponse = {
          id: 1,
          name: "Test Product",
          price: 100.5,
          short_description: "Short description",
          long_description: "Long description",
        };

        mockDbConnection.query.mockResolvedValueOnce({ rows: [expectedResponse] });

        const result = await productService.delete(req);

        expect(mockDbConnection.query).toHaveBeenCalledWith(
          "DELETE FROM products WHERE id = $1 RETURNING *",
          ["1"]
        );
        expect(result).toEqual(expectedResponse);
      });

      it("should delete related entities if relationships are defined", async () => {
        mockEntitySchemaCollection.products.relationships = {
          categories: { table: "products_categories", foreign_key: "product_id" },
        };

        const expectedResponse = {
          id: 1,
          name: "Test Product",
          price: 100.5,
          short_description: "Short description",
          long_description: "Long description",
        };

        mockDbConnection.query
          .mockResolvedValueOnce({ rows: [] }) // Mock the delete from related table
          .mockResolvedValueOnce({ rows: [expectedResponse] }); // Mock the delete from main table

        const result = await productService.delete(req);

        expect(result).toEqual(expectedResponse);
      });

      it("should throw an error if the database query fails", async () => {
        mockDbConnection.query.mockRejectedValue(new Error("Database error"));

        await expect(productService.delete(req)).rejects.toThrow("Database error");
      });
    });
  });
});
