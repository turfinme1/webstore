class Repository {
  constructor(client, tableName) {
    this.client = client;
    this.tableName = tableName;
  }

  async getAllAsync() {
    const query = `SELECT * FROM ${this.tableName}`;
    const { rows } = await this.client.query(query);
    return rows;
  }

  async getByIdAsync(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const { rows } = await this.client.query(query, [id]);
    return rows[0];
  }

  async getAllSettlementsByNameAsync(name) {
    const query = `SELECT nm.ekatte,nm.name as "naseleno",COALESCE (km.name, 'not found') as "kmetstvo",COALESCE (ob.name, 'not found') as "obshtina",COALESCE(obl.name, 'not found') as "oblast" FROM public.${this.tableName} nm LEFT JOIN public.kmetstvo km ON km.id = nm.kmetstvo_id LEFT JOIN public.obshtina ob ON ob.id = km.obshtina_id LEFT JOIN public.oblast obl ON obl.id = ob.oblast_id WHERE LOWER(nm.name) = LOWER($1)`;
    const { rows } = await this.client.query(query, [name]);
    return rows;
  }

  async createAsync(entity) {
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const query = `INSERT INTO ${this.tableName}(${keys.join(
      ","
    )}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`;
    const { rows } = await this.client.query(query, values);
    return rows[0];
  }

  async updateAsync(id, entity) {
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const query = `UPDATE ${this.tableName} SET ${keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(",")} WHERE id = $${keys.length + 1} RETURNING *`;
    const { rows } = await this.client.query(query, [...values, id]);
    return rows[0];
  }

  async deleteAsync(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
    const { rows } = await this.client.query(query, [id]);
    return rows[0];
  }
}

export default Repository;
