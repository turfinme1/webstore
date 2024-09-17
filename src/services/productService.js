class ProductService {
  constructor() {
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
    this.createComment = this.createComment.bind(this);
    this.createRating = this.createRating.bind(this);
  }

  async getFilteredPaginated(data) {
    const schema = data.entitySchemaCollection.products;
    const offset = (data.query.page - 1) * data.query.pageSize;
    let searchValues = [];
    let conditions = [];

    if (data.query.searchParams.keyword) {
      const searchableFields = Object.keys(schema.displayProperties).filter(
          (property) => schema.displayProperties[property].searchable
      );
      const keywordConditions = searchableFields.map((property) => {
          searchValues.push(data.query.searchParams.keyword);
          return `STRPOS(LOWER(CAST(${property} AS text)), LOWER($${searchValues.length})) > 0`;
      }).join(' OR ');

      conditions.push(`(${keywordConditions})`);
  }

    if (data.query.filterParams.categories && data.query.filterParams.categories.length > 0) {
      const categoryPlaceholders = data.query.filterParams.categories
        .map((_, index) => `$${searchValues.length + index + 1}`)
        .join(", ");
      searchValues.push(...data.query.filterParams.categories);
      conditions.push(
        `ARRAY(SELECT unnest(categories)) && ARRAY[${categoryPlaceholders}]::text[]`
      );
    }

    if (data.query.filterParams.price) {
      if (data.query.filterParams.price.min) {
        searchValues.push(data.query.filterParams.price.min);
        conditions.push(`price >= $${searchValues.length}`);
      }
      if (data.query.filterParams.price.max) {
        searchValues.push(data.query.filterParams.price.max);
        conditions.push(`price <= $${searchValues.length}`);
      }
    }

    const combinedConditions = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}` 
      : "";

    const orderByClause = data.query.orderParams.length > 0
        ? data.query.orderParams
            .map(([column, direction]) => `${column} ${direction.toUpperCase()}`)
            .join(", ")
        : "id ASC";

    const query = `
      SELECT * FROM ${schema.views} 
      ${combinedConditions} 
      ORDER BY ${orderByClause} 
      LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}`;

    const totalCount = await data.dbConnection.query(`SELECT COUNT(*) FROM ${schema.views} ${combinedConditions}`, searchValues); 
    const result = await data.dbConnection.query(query, [...searchValues, data.query.pageSize , offset]);
    return { result: result.rows, count: totalCount.rows[0].count };
  }

  async createComment(data) {
    const result = await data.dbConnection.query(`
      INSERT INTO comments (product_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *`,
      [data.query.productId, data.query.userId, data.query.comment]
    );
    
    return result.rows[0];
  }

  async createRating(data) {
    const result = await data.dbConnection.query(`
      INSERT INTO ratings (product_id, user_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, user_id) 
      DO UPDATE SET rating = EXCLUDED.rating
      RETURNING *`,
      [data.productId, data.userId, data.rating]
    );

    return result.rows[0];
  }
}


module.exports = ProductService;