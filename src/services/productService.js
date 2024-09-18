class ProductService {
  constructor() {
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }

  async getFilteredPaginated(params) {
    const schema = params.entitySchemaCollection.products;
    const offset = (params.query.page - 1) * params.query.pageSize;
    let searchValues = [];
    let conditions = [];

    if (params.query.searchParams.keyword) {
      const searchableFields = Object.keys(schema.displayProperties).filter(
          (property) => schema.displayProperties[property].searchable
      );
      const keywordConditions = searchableFields.map((property, index) => {
          searchValues.push(params.query.searchParams.keyword);
          return `STRPOS(LOWER(CAST(${property} AS text)), LOWER($${searchValues.length})) > 0`;
      }).join(' OR ');

      conditions.push(`(${keywordConditions})`);
  }

    if (params.query.filterParams.categories && params.query.filterParams.categories.length > 0) {
      const categoryPlaceholders = params.query.filterParams.categories
        .map((_, index) => `$${searchValues.length + index + 1}`)
        .join(", ");
      searchValues.push(...params.query.filterParams.categories);
      conditions.push(
        `ARRAY(SELECT unnest(categories)) && ARRAY[${categoryPlaceholders}]::text[]`
      );
    }

    if (params.query.filterParams.price) {
      if (params.query.filterParams.price.min) {
        searchValues.push(params.query.filterParams.price.min);
        conditions.push(`price >= $${searchValues.length}`);
      }
      if (params.query.filterParams.price.max) {
        searchValues.push(params.query.filterParams.price.max);
        conditions.push(`price <= $${searchValues.length}`);
      }
    }

    const combinedConditions = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}` 
      : "";

    const orderByClause = params.query.orderParams.length > 0
        ? params.query.orderParams
            .map(([column, direction]) => `${column} ${direction.toUpperCase()}`)
            .join(", ")
        : "id ASC";

    const query = `
      SELECT * FROM ${schema.views} 
      ${combinedConditions} 
      ORDER BY ${orderByClause} 
      LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}`;

    const result = await params.dbConnection.query(query, [...searchValues, params.query.pageSize , offset]);
    return result.rows;
  }
}

module.exports = ProductService;