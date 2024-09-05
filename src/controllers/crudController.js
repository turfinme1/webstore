class CrudController {
  constructor(entitySchemaCollection) {
    this.entitySchemaCollection = entitySchemaCollection;
    this.create = this.create.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.deleteEntity = this.deleteEntity.bind(this);
  }

  async create(req, res, next) {
    try {
      const schema = this.entitySchemaCollection[req.params.entity];
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
      const schema = this.entitySchemaCollection[req.params.entity];
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
      const schema = this.entitySchemaCollection[req.params.entity];
      const connection = req.dbConnection;
      const result = await connection.query(`SELECT * FROM ${schema.views}`);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async getFilteredPaginated(req, res, next) {
    const schema = this.entitySchemaCollection[req.params.entity];
    const viewName = schema.views;
    let searchParams = req.query.searchParams
      ? JSON.parse(req.query.searchParams)
      : {};
    let orderParams = req.query.orderParams
      ? JSON.parse(req.query.orderParams)
      : [];
    let page = req.query.page || 1;
    let pageSize = req.query.pageSize || 30;
    const offset = (page - 1) * pageSize;
    const connection = req.dbConnection;

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
      if (searchParams.price.min) {
        searchValues.push(searchParams.price.min);
        filterConditions.push(`price >= $${searchValues.length}`);
      }
      if (searchParams.price.max) {
        searchValues.push(searchParams.price.max);
        filterConditions.push(`price <= $${searchValues.length}`);
      }
    }

    // Handle category filtering (e.g., categories: ["Electronics", "Books"])
    if (searchParams.categories && searchParams.categories.length > 0) {
      const categoryPlaceholders = searchParams.categories
        .map((_, index) => `$${searchValues.length + index + 1}`)
        .join(", ");
      searchValues.push(...searchParams.categories);
      filterConditions.push(
        `ARRAY(SELECT LOWER(unnest(categories))) && ARRAY[${categoryPlaceholders}]::text[]`
      );
    }

    // Combine keyword conditions with OR and other filter conditions with AND
    let combinedConditions = [];

    // If there are keyword search conditions, combine them using OR
    if (keywordSearchConditions.length > 0) {
      combinedConditions.push(`(${keywordSearchConditions.join(" OR ")})`);
    }

    // If there are filter conditions, combine them using AND
    if (filterConditions.length > 0) {
      combinedConditions.push(`${filterConditions.join(" AND ")}`);
    }

    // Build final search condition string, combining keyword and filter conditions with AND
    const searchConditionStr =
      combinedConditions.length > 0
        ? `WHERE ${combinedConditions.join(" AND ")}`
        : "";

    const orderByClause =
      orderParams.length > 0
        ? orderParams
            .map(([column, direction]) => `${column} ${direction}`)
            .join(", ")
        : "id";

    let query = `
      SELECT * FROM ${viewName} 
      ${searchConditionStr} 
      ORDER BY ${orderByClause} 
      LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}`;

    let countQuery = `SELECT COUNT(*) FROM ${viewName} ${searchConditionStr}`;

    const { rows } = await connection.query(query, [
      ...searchValues,
      pageSize,
      offset,
    ]);
    const totalRowCount = await connection.query(countQuery, searchValues);
    const count = totalRowCount[0].count;

    res.json( rows );
  }

  async update(req, res, next) {
    try {
      const schema = this.entitySchemaCollection[req.url.split("/")[2]];
      const data = req.body;
      const { id } = req.params;
      const connection = req.dbConnection;

      const keys = Object.keys(schema.properties);
      const values = keys.map((key) => data[key]);

      let query = `UPDATE ${schema.name} SET ${keys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(", ")}`;
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
