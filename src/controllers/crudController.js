class CrudController {
  constructor(pool) {
    this.pool = pool;
    this.deleteEntity = this.deleteEntity.bind(this);
    this.update = this.update.bind(this);
    this.getById = this.getById.bind(this);
    this.getAll = this.getAll.bind(this);
    this.create = this.create.bind(this);
  }

  async deleteEntity(req, res, next) {
    try {
      const connection = await this.pool.connect();
      const { entity, id } = req.params;
      const result = await connection.query(
        `DELETE FROM ${entity} WHERE id = $1 RETURNING *`,
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

  async update(req, res, next) {
    try {
      const connection = await this.pool.connect();
      const { entity, id } = req.params;
      const data = req.body;
      const columns = Object.keys(data)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(", ");
      const values = Object.values(data);

      const query = `UPDATE ${entity} SET ${columns} WHERE id = $${
        values.length + 1
      } RETURNING *`;
      const result = await connection.query(query, [...values, id]);
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const connection = await this.pool.connect();
      const { entity, id } = req.params;
      const result = await connection.query(
        `SELECT * FROM ${entity} WHERE id = $1`,
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
      const connection = await this.pool.connect();
      const { entity } = req.params;
      const result = await connection.query(`SELECT * FROM ${entity}_view`);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const connection = await this.pool.connect();
      const { entity } = req.params;
      const data = req.body;
      const columns = Object.keys(data).join(", ");
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

      const query = `INSERT INTO ${entity} (${columns}) VALUES (${placeholders}) RETURNING *`;
      const result = await connection.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CrudController;