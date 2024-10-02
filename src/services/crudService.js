const bcrypt = require("bcrypt");

class CrudService {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }

  async create(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    const keys = Object.keys(schema.properties);

    if(data.body.password_hash){
      data.body.password_hash = await bcrypt.hash(data.body.password_hash, 10);
    }
    const values = keys.map((key) => data.body[key]);

    const query = `INSERT INTO ${schema.name}(${keys.join(",")}) VALUES(${keys
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;

    const result = await data.dbConnection.query(query, values);

    return result.rows;
  }

  async getFilteredPaginated(data) {
    const schema = data.entitySchemaCollection[data.params.entity]; 
    const offset = (data.query.page - 1) * data.query.pageSize;
    let searchValues = [];
    let conditions = [];
  
    if (data.query.filterParams) {
      for (const [filterField, filterValue] of Object.entries(data.query.filterParams)) {
        if (Array.isArray(filterValue)) {
          // Handle arrays (e.g., categories or IDs)
          const filterPlaceholders = filterValue
            .map((_, index) => `$${searchValues.length + index + 1}`)
            .join(", ");
          searchValues.push(...filterValue);
          conditions.push(`${filterField} IN (${filterPlaceholders})`);
        } else if (typeof filterValue === 'string') {
          // Handle partial matches for string fields (e.g., email contains 'gmail.com')
          searchValues.push(`${filterValue}`);
          conditions.push(`STRPOS(LOWER(CAST(${filterField} AS text)), LOWER($${searchValues.length})) > 0`);
        } else if (typeof filterValue === 'object') {
          // Handle range filters like price or other numeric filters
          if (filterValue.min) {
            searchValues.push(filterValue.min);
            conditions.push(`${filterField} >= $${searchValues.length}`);
          }
          if (filterValue.max) {
            searchValues.push(filterValue.max);
            conditions.push(`${filterField} <= $${searchValues.length}`);
          }
        } else {
          // Handle exact matches for other data types (e.g., ID or boolean)
          searchValues.push(filterValue);
          conditions.push(`${filterField} = $${searchValues.length}`);
        }
      }
    }
  
    const combinedConditions = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}`
      : "";
  
    const orderByClause = data.query.orderParams && data.query.orderParams.length > 0
      ? data.query.orderParams
          .map(([column, direction]) => `${column} ${direction.toUpperCase()}`)
          .join(", ")
      : "id ASC";
  
    const query = `
      SELECT * FROM ${schema.views} 
      ${combinedConditions} 
      ORDER BY ${orderByClause} 
      LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}`;
  
    const totalCount = await data.dbConnection.query(
      `SELECT COUNT(*) FROM ${schema.views} ${combinedConditions}`,
      searchValues
    );
    
    const result = await data.dbConnection.query(query, [...searchValues, data.query.pageSize, offset]);
  
    return { result: result.rows, count: totalCount.rows[0].count };
  }
  

  async getById(data) {
    const schema = data.entitySchemaCollection[data.params.entity];

    const result = await data.dbConnection.query(
      `SELECT * FROM ${schema.views} WHERE id = $1`,
      [data.params.id]
    );

    return result.rows[0];
  }

  async getAll(data) {
    const schema = data.entitySchemaCollection[data.params.entity];

    const result = await data.dbConnection.query(
      `SELECT * FROM ${schema.views}`
    );

    return result.rows;
  }

  async update(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    let keys = Object.keys(schema.properties);

    if(data.body.password_hash){
      data.body.password_hash = await bcrypt.hash(data.body.password_hash, 10);
    } else {
      keys = keys.filter(key => key !== 'password_hash');
    }

    const values = keys.map((key) => data.body[key]);
    let query = `UPDATE ${schema.name} SET ${keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ")}`;
    query += ` WHERE id = $${keys.length + 1} RETURNING *`;

    const result = await data.dbConnection.query(query, [...values, data.params.id]);

    return result.rows[0];
  }

  async delete(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    await this.deleteRelationships(data, schema, data.params.id);

    const result = await data.dbConnection.query(
      `DELETE FROM ${schema.name} WHERE id = $1 RETURNING *`,
      [data.params.id]
    );

    return result.rows[0];
  }

  async deleteRelationships(data, schema, parentId) {
    if (!schema.relationships) return;  

    for (const relationship of Object.values(schema.relationships)) {
      // If there are nested relationships, delete them first
      if (relationship.nested_relationships) {
        const nestedSchema = {
          relationships: relationship.nested_relationships
        };
        
        // Query to get all the related entity ids for the nested relationships
        const relatedEntities = await data.dbConnection.query(
          `SELECT id FROM ${relationship.table} WHERE ${relationship.foreign_key} = $1`,
          [parentId]
        );

        // Recursively delete the nested relationships for each related entity
        for (const relatedEntity of relatedEntities.rows) {
          await this.deleteRelationships(data, nestedSchema, relatedEntity.id);
        }
      }

      // Delete the current relationship entries
      await data.dbConnection.query(
        `DELETE FROM ${relationship.table} WHERE ${relationship.foreign_key} = $1`,
        [parentId]
      );
    }
  }
}

module.exports = CrudService;