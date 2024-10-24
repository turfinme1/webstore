const bcrypt = require("bcrypt");

class CrudService {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
    this.buildFilteredPaginatedQuery = this.buildFilteredPaginatedQuery.bind(this);
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
    const builtQuery = this.buildFilteredPaginatedQuery(data);
    const offset = (data.query.page - 1) * data.query.pageSize;
    const paginatedQuery = `${builtQuery.query} LIMIT $${builtQuery.searchValues.length + 1} OFFSET $${builtQuery.searchValues.length + 2}`;

    const totalCount = await data.dbConnection.query(builtQuery.aggregatedTotalQuery, builtQuery.searchValues);
    const result = await data.dbConnection.query(paginatedQuery, [...builtQuery.searchValues, data.query.pageSize, offset]);
    
    return { result: result.rows, count: totalCount.rows[0].total_rows, groupCount: totalCount.rows[0]?.total_count, aggregationResults: totalCount.rows[0] };
  }

  buildFilteredPaginatedQuery(data) {
    const schema = data.entitySchemaCollection[data.params.entity]; 
    let searchValues = [];
    let conditions = [];
    let selectFields = [];
    let groupBySets = [];
    let orderByClause = "";
    let appliedFilters = {};
  
    if (data.query.filterParams) {
      for (const [filterField, filterValue] of Object.entries(data.query.filterParams)) {
        appliedFilters[filterField] = filterValue;

        if (Array.isArray(filterValue)) {
          const filterPlaceholders = filterValue
            .map((_, index) => `$${searchValues.length + index + 1}`)
            .join(", ");
          searchValues.push(...filterValue);
          conditions.push(`${filterField} IN (${filterPlaceholders})`);
        } else if (typeof filterValue === 'string') {
          searchValues.push(`${filterValue}`);
          conditions.push(`STRPOS(LOWER(CAST(${filterField} AS text)), LOWER($${searchValues.length})) > 0`);
        } else if (schema.properties[filterField]?.format === 'date-time') {
          if(filterValue.min && filterValue.max) {
            searchValues.push(filterValue.min);
            searchValues.push(filterValue.max);
            conditions.push(`DATE_TRUNC('day', ${filterField}) >= $${searchValues.length - 1} AND DATE_TRUNC('day', ${filterField}) <= $${searchValues.length}`);
          } else if (filterValue.min) {
            searchValues.push(filterValue.min);
            conditions.push(`DATE_TRUNC('day', ${filterField}) >= $${searchValues.length}`);
          } else if (filterValue.max) {
            searchValues.push(filterValue.max);
            conditions.push(`DATE_TRUNC('day', ${filterField}) <= $${searchValues.length}`);
          }
        } else if (typeof filterValue === 'object') {
          if (filterValue.min) {
            searchValues.push(filterValue.min);
            conditions.push(`${filterField} >= $${searchValues.length}`);
          }
          if (filterValue.max) {
            searchValues.push(filterValue.max);
            conditions.push(`${filterField} <= $${searchValues.length}`);
          }
        } else {
          searchValues.push(filterValue);
          conditions.push(`${filterField} = $${searchValues.length}`);
        }
      }
    }
    
    if (data.query.groupParams) {
      for (const groupField of data.query.groupParams) {
        const fieldConfig = schema.properties[groupField.column];
        if (fieldConfig?.groupable) {
          if (fieldConfig.format === 'date-time') {
            const fieldAlias = `${fieldConfig.aggregation}('${groupField.granularity}', ${groupField.column})`;
            groupBySets.push(fieldAlias);
            selectFields.push(`${fieldAlias} AS ${groupField.column}`);
          } else {
            groupBySets.push(groupField.column);
            selectFields.push(groupField.column);
          }
        }
      };

      for (const [key, value] of Object.entries(schema.properties)) {
        if (value.group_behavior) {
          selectFields.push(`${value.group_behavior}(${key}) AS ${key}`);
        }
      }
      
      selectFields.push("COUNT(*) AS count");
    } 

    if (groupBySets.length > 0) {
      orderByClause = ` ${groupBySets.join(" DESC, ")}`;
    } else {
      selectFields = ["*"];
      orderByClause = data.query.orderParams.length > 0
        ? data.query.orderParams
            .map(([column, direction]) => `${column} ${direction.toUpperCase()}`)
            .join(", ")
        : "id ASC";
    }

    const combinedConditions = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}`
      : "";
    
    const groupingClause = groupBySets.length > 0 
      ? `GROUP BY GROUPING SETS ((${groupBySets.join(", ")}))`
      : "";
  
    const query = `
      SELECT ${selectFields.join(", ")}
      FROM ${schema.views} 
      ${combinedConditions}
      ${groupingClause}
      ORDER BY ${orderByClause}`;
    
    const groupBehaviorFields = Object.entries(schema.properties)
      .filter(([_, value]) => value.group_behavior);

    const aggregatedTotalQuery = groupBySets.length > 0
      ? `
        SELECT 
         ${groupBehaviorFields.length > 0 
          ? groupBehaviorFields
            .map(([key, value]) => `${value.group_behavior}(${key}) AS total_${key}`)
            .join(", ")
            .concat(", ") 
          : ""} 
          COUNT(*) AS total_rows, SUM(subquery.groupCount) AS total_count
        FROM (
          SELECT
          ${groupBehaviorFields.length > 0 
            ? groupBehaviorFields
              .map(([key, value]) => `${value.group_behavior}(${key}) AS ${key}`)
              .join(", ")
              .concat(", ") 
            : ""} 
            COUNT(*) AS groupCount  
          FROM ${schema.views} 
          ${combinedConditions}
          ${groupingClause}
        ) AS subquery`
      : `SELECT COUNT(*) AS total_rows FROM ${schema.views} ${combinedConditions}`;

    return { query, aggregatedTotalQuery, searchValues, appliedFilters };
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