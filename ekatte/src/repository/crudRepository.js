class CrudRepository {
  constructor(pool, schema) {
    this.pool = pool;
    this.schema = schema;
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

  async getAll() {
    const query = `SELECT * FROM ${this.schema.name} ORDER BY id DESC`;
    const rows = await this._query(query);
    return { success: true, data: rows, statusCode: 200 };
  }

  async getById(id) {
    const query = `SELECT * FROM ${this.schema.name} WHERE id = $1`;
    const rows = await this._query(query, [id]);
    return { success: true, data: rows[0], statusCode: 200 };
  }

  async create(data) {
    const keys = Object.keys(this.schema.properties);
    const values = keys.map((key) => data[key]);
    const query = `INSERT INTO ${this.schema.name}(${keys.join(
      ","
    )}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`;

    const rows = await this._query(query, values);
    return { success: true, data: rows[0], statusCode: 201 };
  }

  async update(id, data) {
    const keys = Object.keys(this.schema.properties);
    const values = keys.map((key) => data[key]);
    const query = `
        UPDATE ${this.schema.name}
        SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(", ")}
        WHERE id = $${keys.length + 1}
        RETURNING *;`;

    const rows = await this._query(query, [...values, id]);
    return { success: true, data: rows[0], statusCode: 200 };
  }

  async delete(id) {
    const query = `DELETE FROM ${this.schema.name} WHERE id = $1 RETURNING *;`;
    const rows = await this._query(query, [id]);
    return { success: true, data: rows[0], statusCode: 200 };
  }

  async getEntities(param) {
    const searchableFields = Object.keys(this.schema.properties).filter(
      (key) => this.schema.properties[key].searchable
    );

    if (searchableFields.length === 0) {
      throw new Error("No searchable fields found");
    }

    const query = `
        SELECT * FROM ${this.schema.name}
        WHERE ${searchableFields
          .map((field) => `STRPOS(LOWER(${field}), LOWER($1)) > 0`)
          .join(" OR ")}
        ORDER BY ${searchableFields[0]};`;

    const searchText = [param];
    const rows = await this._query(query, searchText);
    return { success: true, data: rows, statusCode: 200 };
  }
}

export default CrudRepository;