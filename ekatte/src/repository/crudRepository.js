import { ASSERT, ASSERT_USER } from "../util/requestUtilities.js";

class CrudRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async _query(query, values = []) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(query, values);
      return rows;
    } catch (error) {
      ASSERT(error.code !== '23505', 409, "Record already exists");
      ASSERT(error.code !== '23503', 404, "Record with given ID was not found");
      ASSERT_USER(error.code !== '22P02', 400, "Invalid data type");
      ASSERT(false, 500, "Internal Server Error");
    } 
    finally {
      client.release();
    }
  }

  async getAll(request, params) {
    const schema = params.schema;
    const query = `SELECT * FROM ${schema.name} ORDER BY id DESC`;
    const rows = await this._query(query);
    return { success: true, data: rows, statusCode: 200 };
  }

  async getById(request, params) {
    const schema = params.schema;
    const id = params.id;
    const query = `SELECT * FROM ${schema.name} WHERE id = $1`;
    const rows = await this._query(query, [id]);
    return { success: true, data: rows[0], statusCode: 200 };
  }

  async create(request, params) {
    const schema = params.schema;
    const data = request.bodyData;

    const keys = Object.keys(schema.properties);
    const values = keys.map((key) => data[key]);
    const query = `INSERT INTO ${schema.name}(${keys.join(",")}) VALUES(${keys
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;

    const rows = await this._query(query, values);
    return { success: true, data: rows[0], statusCode: 201 };
  }

  async update(request, params) {
    const schema = params.schema;
    const data = request.bodyData;
    const id = params.id;

    const keys = Object.keys(schema.properties);
    const values = keys.map((key) => data[key]);
    const query = `
          UPDATE ${schema.name}
          SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(", ")}
          WHERE id = $${keys.length + 1}
          RETURNING *;`;

    const rows = await this._query(query, [...values, id]);
    return { success: true, data: rows[0], statusCode: 200 };
  }

  async delete(request, params) {
    const schema = params.schema;
    const id = params.id;

    const query = `DELETE FROM ${schema.name} WHERE id = $1 RETURNING *;`;
    const rows = await this._query(query, [id]);
    return { success: true, data: rows[0], statusCode: 200 };
  }

  async getEntities(request, params) {
    const schema = params.schema;
    const param = request.params.search;

    const searchableFields = Object.keys(schema.properties).filter(
      (key) => schema.properties[key].searchable
    );

    if (searchableFields.length === 0) {
      throw new Error("No searchable fields found");
    }

    const query = `
          SELECT * FROM ${schema.name}
          WHERE ${searchableFields
            .map((field) => `STRPOS(LOWER(${field}), LOWER($1)) > 0`)
            .join(" OR ")}
          ORDER BY ${searchableFields[0]};`;

    const searchText = [param];
    const rows = await this._query(query, searchText);
    return { success: true, data: rows, statusCode: 200 };
  }

  async getEntitiesOrderedPaginated(request, params) {
    const schema = params.schema;
    const viewName = schema.views;  
    let searchParams = request.params.searchParams ? JSON.parse(request.params.searchParams) : {};
    let orderParams = request.params.orderParams ? JSON.parse(request.params.orderParams) : [];
    let paramsCount = Object.keys(searchParams).length;
    let page = request.params.page || 1;
    let pageSize = request.params.pageSize || 20;
    const offset = (page - 1) * pageSize;
    
    const searchConditions = Object.entries(searchParams)
      .map(([column, value], index) => `STRPOS(LOWER(CAST(${column} AS text)), LOWER($${index + 1})) > 0`)
      .join(" AND ");
    
    const orderByClause = orderParams
      .map(([column, direction]) => `${column} ${direction}`)
      .join(", ");
      
    const searchValues = Object.values(searchParams);

    let query = `SELECT * FROM ${viewName} `;
    if (paramsCount > 0) {
      query += `WHERE ${searchConditions} `;
    }
    if (orderParams.length > 0) {
      query += `ORDER BY ${orderByClause} `;
    }
    query += `LIMIT $${paramsCount + 1} OFFSET $${paramsCount + 2}`;

    let countQuery = `SELECT COUNT(*) FROM ${viewName} `;
    if (paramsCount > 0) {
      countQuery += `WHERE ${searchConditions} `;
    }   

    const rows = await this._query(query, [...searchValues, pageSize, offset]);
    const totalRowCount = await this._query(countQuery, searchValues);
    const count = totalRowCount[0].count;
    return { success: true, data: { rows, totalRowCount: count }, statusCode: 200, };
  }
}

export default CrudRepository;