class ProductService {
  constructor(entitySchemaCollection) {
    this.entitySchemaCollection = entitySchemaCollection;
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }

  async getFilteredPaginated(req) {
    const schema = this.  entitySchemaCollection["products"];
    const viewName = schema.views;
    let searchParams = req.query.searchParams
      ? JSON.parse(req.query.searchParams)
      : {};
    let orderParams = req.query.orderParams
      ? JSON.parse(req.query.orderParams)
      : [];
    let page = req.query.page || 1;
    let pageSize = req.query.pageSize || 30;
    const offset = (page - 1) * pageSize;
    const connection = req.dbConnection;

    let searchValues = [];
    let keywordSearchConditions = [];
    let filterConditions = [];

    if (searchParams.keyword) {
      const searchable = Object.keys(schema.displayProperties).filter(
        (property) => schema.displayProperties[property].searchable
      );

      for (const property of searchable) {
        searchValues.push(searchParams.keyword);
        keywordSearchConditions.push(
          `STRPOS(LOWER(CAST(${property} AS text)), LOWER($${searchValues.length})) > 0`
        );
      }
    }

    if (searchParams.price) {
      if (searchParams.price.min) {
        searchValues.push(searchParams.price.min);
        filterConditions.push(`price >= $${searchValues.length}`);
      }
      if (searchParams.price.max) {
        searchValues.push(searchParams.price.max);
        filterConditions.push(`price <= $${searchValues.length}`);
      }
    }

    // Handle category filtering (e.g., categories: ["Electronics", "Books"])
    if (searchParams.categories && searchParams.categories.length > 0) {
      const categoryPlaceholders = searchParams.categories
        .map((_, index) => `$${searchValues.length + index + 1}`)
        .join(", ");
      searchValues.push(...searchParams.categories);
      filterConditions.push(
        `ARRAY(SELECT unnest(categories)) && ARRAY[${categoryPlaceholders}]::text[]`
      );
    }

    // Combine keyword conditions with OR and other filter conditions with AND
    let combinedConditions = [];

    // If there are keyword search conditions, combine them using OR
    if (keywordSearchConditions.length > 0) {
      combinedConditions.push(`(${keywordSearchConditions.join(" OR ")})`);
    }

    // If there are filter conditions, combine them using AND
    if (filterConditions.length > 0) {
      combinedConditions.push(`${filterConditions.join(" AND ")}`);
    }

    // Build final search condition string, combining keyword and filter conditions with AND
    const searchConditionStr =
      combinedConditions.length > 0
        ? `WHERE ${combinedConditions.join(" AND ")}`
        : "";

    const orderByClause =
      orderParams.length > 0
        ? orderParams
            .map(([column, direction]) => `${column} ${direction}`)
            .join(", ")
        : "id";

    let query = `
          SELECT * FROM ${viewName} 
          ${searchConditionStr} 
          ORDER BY ${orderByClause} 
          LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}`;

    let countQuery = `SELECT COUNT(*) FROM ${viewName} ${searchConditionStr}`;

    const result = await connection.query(query, [
      ...searchValues,
      pageSize,
      offset,
    ]);
    // const totalRowCount = await connection.query(countQuery, searchValues);
    // const count = totalRowCount[0].count;

    return result.rows;
  }
}

module.exports = ProductService;