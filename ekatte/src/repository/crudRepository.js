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
        if (error.code === '23505') {
          throw { success: false, statusCode: 409, data: null, errors: 'Entity already exists' };
        } else if (error.code === '23503') {
          throw { success: false, statusCode: 404, data: null, errors: 'Entity ID not found' };
        }
        throw { success: false, statusCode: 500, data: null, errors: "Internal Server Error" };
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
    let {
      searchParam = "",
      orderColumn,
      orderType = "ASC",
      searchColumn = "all",
      page = 1,
      pageSize = 20,
    } = request.params;
    const viewName = schema.views;

    if (!orderColumn) {
      orderColumn = Object.keys(schema.displayProperties)[0];
    }

    if (searchColumn === "all") {
      searchColumn = Object.keys(schema.properties).filter(
        (key) => schema.properties[key].searchable
      );
    } else {
      searchColumn = [searchColumn];
    }

    let conditions = searchColumn
      .map((column) => `STRPOS(LOWER(CAST(${column} AS text)), LOWER($1)) > 0`)
      .join(" OR ");

    const offset = (page - 1) * pageSize;
    const query = `SELECT * FROM ${viewName}  
          WHERE ${conditions}
          ORDER BY ${orderColumn} ${orderType}
          LIMIT $2 OFFSET $3`;
    const countQuery = `
        SELECT COUNT(*) FROM ${viewName} 
        WHERE ${conditions}`;

    const rows = await this._query(query, [searchParam, pageSize, offset]);
    const totalRowCount = await this._query(countQuery, [searchParam]);
    const count = totalRowCount[0].count;
    return { success: true, data: { rows, totalRowCount: count }, statusCode: 200, };
  }
}

export default CrudRepository;
