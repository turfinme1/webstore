class CrudService {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
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
}

module.exports = CrudService;