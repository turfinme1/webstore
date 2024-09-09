class ProductService {
  constructor() {
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }

  async getFilteredPaginated(req, res) {
    const schema = req.entitySchemaCollection["products"];  
    const searchParams = req.query.searchParams ? JSON.parse(req.query.searchParams) : {};
    const orderParams = req.query.orderParams ? JSON.parse(req.query.orderParams) : [];
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
    const page = req.query.page ? parseInt(req.query.page) : 1;   
    const offset = (page - 1) * pageSize;
    
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

    if (searchParams.categories && searchParams.categories.length > 0) {
      const categoryPlaceholders = searchParams.categories
        .map((_, index) => `$${searchValues.length + index + 1}`)
        .join(", ");
      searchValues.push(...searchParams.categories);
      filterConditions.push(
        `ARRAY(SELECT unnest(categories)) && ARRAY[${categoryPlaceholders}]::text[]`
      );
    }

    const combinedConditions = [
      ...keywordSearchConditions.length > 0 ? [`(${keywordSearchConditions.join(" OR ")})`] : [],
      ...filterConditions.length > 0 ? [`${filterConditions.join(" AND ")}`] : []
    ].join(" AND ");

    const searchConditionStr = combinedConditions.length > 0 ? `WHERE ${combinedConditions}` : "";

    const orderByClause = orderParams.length > 0
      ? orderParams.map(([column, direction]) => `${column} ${direction}`).join(", ")
      : "id";

    const query = `
      SELECT * FROM ${schema.views} 
      ${searchConditionStr} 
      ORDER BY ${orderByClause} 
      LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}
    `;

    const result = await req.dbConnection.query(query, [...searchValues, pageSize, offset]);

    return result.rows;
  }
}

module.exports = ProductService;
