class CrudController {
  constructor(entitySchemaCollection) {
    this.entitySchemaCollection = entitySchemaCollection;
    this.deleteEntity = this.deleteEntity.bind(this);
    this.update = this.update.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.create = this.create.bind(this);
  }

  async create(req, res, next) {
    try {
      const schema = this.entitySchemaCollection[req.url.split("/")[2]];
      const connection = req.dbConnection;
      const data = req.body;
      const keys = Object.keys(schema.properties);
      const values = keys.map((key) => data[key]);
      
      const query = `INSERT INTO ${schema.name}(${keys.join(",")}) VALUES(${keys
        .map((_, i) => `$${i + 1}`)
        .join(",")}) RETURNING *`;
  
      const result = await connection.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const schema = this.entitySchemaCollection[req.url.split("/")[2]];
      const connection = req.dbConnection;
      const { id } = req.params;

      const result = await connection.query(
        `SELECT * FROM ${schema.views} WHERE id = $1`,
        [id]
      );
      if (result.rows.length) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: "Entity not found" });
      }
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const schema = this.entitySchemaCollection[req.url.split("/")[2]];
      const connection = req.dbConnection;
      const result = await connection.query(`SELECT * FROM ${schema.views}`);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const schema = this.entitySchemaCollection[req.url.split("/")[2]];
      const data = req.body;
      const { id } = req.params;
      const connection = req.dbConnection;

      const keys = Object.keys(schema.properties);
      const values = keys.map((key) => data[key]);

      let query = `UPDATE ${schema.name} SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(", ")}`;
      query += ` WHERE id = $${keys.length + 1} RETURNING *`;

      const result = await connection.query(query, [...values, id]);
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }

  async deleteEntity(req, res, next) {
    try {
      const schema = this.entitySchemaCollection[req.url.split("/")[2]];
      const connection = req.dbConnection;
      const { id } = req.params;
      const result = await connection.query(
        `DELETE FROM ${schema.name} WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rows.length) {
        res.json({ message: "Entity deleted" });
      } else {
        res.status(404).json({ error: "Entity not found" });
      }
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CrudController;