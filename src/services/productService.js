const { ASSERT_USER } = require("../serverConfigurations/assert");

class ProductService {
  constructor() {
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }

  async getFilteredPaginated(params) {
    const schema = params.entitySchemaCollection["products"];  
    const searchParams = params.query.searchParams ? JSON.parse(params.query.searchParams) : {};
    const orderParams = params.query.orderParams ? JSON.parse(params.query.orderParams) : [];
    const pageSize = params.query.pageSize ? parseInt(params.query.pageSize) : 10;
    const page = params.query.page ? parseInt(params.query.page) : 1;   
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
      ASSERT_USER((searchParams.price.min || 0) <= (searchParams.price.max || Infinity), "Invalid price range");
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

    const result = await params.dbConnection.query(query, [...searchValues, pageSize, offset]);

    return result.rows;
  }
}

module.exports = ProductService;
