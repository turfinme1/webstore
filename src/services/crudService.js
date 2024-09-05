class CrudService {
  constructor(entitySchemaCollection) {
    this.entitySchemaCollection = entitySchemaCollection;
    this.create = this.create.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async create(req) {
    const schema = this.entitySchemaCollection[req.params.entity];
    const keys = Object.keys(schema.properties);
    const values = keys.map((key) => req.body[key]);

    const query = `INSERT INTO ${schema.name}(${keys.join(",")}) VALUES(${keys
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;

    const result = await req.dbConnection.query(query, values);

    return result.rows;
  }

  async getById(req) {
    const schema = this.entitySchemaCollection[req.params.entity];
    const { id } = req.params;

    const result = await req.dbConnection.query(
      `SELECT * FROM ${schema.views} WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  async getAll(req) {
    const schema = this.entitySchemaCollection[req.params.entity];

    const result = await req.dbConnection.query(
      `SELECT * FROM ${schema.views}`
    );

    return result.rows;
  }

  async update(req) {
    const schema = this.entitySchemaCollection[req.params.entity];
    const { id } = req.params;
    const keys = Object.keys(schema.properties);
    const values = keys.map((key) => req.body[key]);
    let query = `UPDATE ${schema.name} SET ${keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ")}`;
    query += ` WHERE id = $${keys.length + 1} RETURNING *`;

    const result = await req.dbConnection.query(query, [...values, id]);

    return result.rows[0];
  }

  async delete(req) {
    const schema = this.entitySchemaCollection[req.params.entity];
    const { id } = req.params;

    const result = await req.dbConnection.query(
      `DELETE FROM ${schema.name} WHERE id = $1 RETURNING *`,
      [id]
    );

    return result.rows[0];
  }
}

module.exports = CrudService;