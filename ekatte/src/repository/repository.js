class Repository {
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

  async getStatistics() {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM settlement) AS countSettlements,
        (SELECT COUNT(*) FROM town_hall) AS countTownHalls,
        (SELECT COUNT(*) FROM municipality) AS countMunicipalities,
        (SELECT COUNT(*) FROM region) AS countRegions LIMIT 1;`;
    const rows = await this._query(query);
    return { success: true, data: rows[0], statusCode: 200 };
  }
}

export default Repository;
