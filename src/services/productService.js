const fs = require('fs');
const path = require('path');
const busboy = require('busboy');
const crypto = require('crypto');

class ProductService {
  constructor() {
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
    this.createComment = this.createComment.bind(this);
    this.createRating = this.createRating.bind(this);
    this.getComments = this.getComments.bind(this);
    this.getRatings = this.getRatings.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.handleFileUploads = this.handleFileUploads.bind(this);
  }

  async getFilteredPaginated(data) {
    const schema = data.entitySchemaCollection.products;
    const offset = (data.query.page - 1) * data.query.pageSize;
    let searchValues = [];
    let conditions = [];

    if (data.query.searchParams.keyword) {
      const searchableFields = Object.keys(schema.displayProperties).filter(
          (property) => schema.displayProperties[property].searchable
      );
      const keywordConditions = searchableFields.map((property) => {
          searchValues.push(data.query.searchParams.keyword);
          return `STRPOS(LOWER(CAST(${property} AS text)), LOWER($${searchValues.length})) > 0`;
      }).join(' OR ');

      conditions.push(`(${keywordConditions})`);
  }

    if (data.query.filterParams.categories && data.query.filterParams.categories.length > 0) {
      const categoryPlaceholders = data.query.filterParams.categories
        .map((_, index) => `$${searchValues.length + index + 1}`)
        .join(", ");
      searchValues.push(...data.query.filterParams.categories);
      conditions.push(
        `ARRAY(SELECT unnest(categories)) && ARRAY[${categoryPlaceholders}]::text[]`
      );
    }

    if (data.query.filterParams.price) {
      if (data.query.filterParams.price.min) {
        searchValues.push(data.query.filterParams.price.min);
        conditions.push(`price >= $${searchValues.length}`);
      }
      if (data.query.filterParams.price.max) {
        searchValues.push(data.query.filterParams.price.max);
        conditions.push(`price <= $${searchValues.length}`);
      }
    }

    const combinedConditions = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}` 
      : "";

    const orderByClause = data.query.orderParams.length > 0
        ? data.query.orderParams
            .map(([column, direction]) => `${column} ${direction.toUpperCase()}`)
            .join(", ")
        : "id ASC";

    const query = `
      SELECT * FROM ${schema.views} 
      ${combinedConditions} 
      ORDER BY ${orderByClause} 
      LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}`;

    const totalCount = await data.dbConnection.query(`SELECT COUNT(*) FROM ${schema.views} ${combinedConditions}`, searchValues); 
    const result = await data.dbConnection.query(query, [...searchValues, data.query.pageSize , offset]);
    return { result: result.rows, count: totalCount.rows[0].count };
  }

  async createComment(data) {
    const result = await data.dbConnection.query(`
      INSERT INTO comments (product_id, user_id, comment) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (product_id, user_id)
      DO UPDATE SET comment = EXCLUDED.comment
      RETURNING *`,
      [data.params.id, data.session.user_id, data.body.comment]
    );
    
    return result.rows[0];
  }

  async createRating(data) {
    const result = await data.dbConnection.query(`
      INSERT INTO ratings (product_id, user_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, user_id) 
      DO UPDATE SET rating = EXCLUDED.rating
      RETURNING *`,
      [data.params.id, data.session.user_id, data.body.rating]
    );

    return result.rows[0];
  }

  async getComments(data) {
    const result = await data.dbConnection.query(`
      SELECT * FROM comments_view 
      WHERE product_id = $1`,
      [data.params.id]
    );

    return result.rows;
  }

  async getRatings(data) {
    const result = await data.dbConnection.query(`
      SELECT * FROM product_ratings_view
      WHERE product_id = $1 LIMIT 1`,
      [data.params.id]
    );

    return result.rows;
  }

  async create(data) {
    const schema = data.entitySchemaCollection["products"];
    const keys = Object.keys(schema.properties);

    const filePaths = await this.handleFileUploads(data.req);
    const values = keys.map((key) => data.body[key]);
    const categories = JSON.parse(data.body.categories);
    const query = `INSERT INTO ${schema.name}(${keys.join(",")}) VALUES(${keys
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;

    const productResult = await data.dbConnection.query(query, values);
    
    if (categories.length > 0) {
      const categoryValues = categories
        .map((category, index) => `($1, $${index + 2})`)
        .join(",");
      const categoryQuery = `INSERT INTO products_categories(product_id, category_id) VALUES ${categoryValues}`;
      await data.dbConnection.query(categoryQuery, [productResult.rows[0].id, ...categories]);
    }

    for (const filePath of filePaths) {
      await data.dbConnection.query(
        `INSERT INTO images(product_id, url) VALUES($1, $2)`,
        [productResult.rows[0].id, filePath]
      );
    }

    return productResult.rows[0];
  }

  async update(data) {
    const schema = data.entitySchemaCollection["products"];
    const filePaths = await this.handleFileUploads(data.req);
    const categories = JSON.parse(data.body.categories);
    const imagesToDelete = JSON.parse(data.body.imagesToDelete);

    const keys = Object.keys(schema.properties);
    const values = keys.map((key) => data.body[key]);
    let query = `UPDATE ${schema.name} SET ${keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ")}`;
    query += ` WHERE id = $${keys.length + 1} RETURNING *`;

    const productResult = await data.dbConnection.query(query, [...values, data.params.id]);
    
    for (const image of imagesToDelete) {
      const imageName = image.split('/').pop().split('.')[0];
      const imagePath = path.join(__dirname, '..', '..', '..', 'images', `${imageName}.${image.split('.').pop()}`);
      await fs.promises.unlink(imagePath);
      await data.dbConnection.query(
        `DELETE FROM images WHERE url = $1`,
        [image]
      );
    }

    if (filePaths.length > 0) {
      const imageValues = filePaths
        .map((filePath, index) => `($1, $${index + 2})`)
        .join(",");
      await data.dbConnection.query(`
        INSERT INTO images(product_id, url) VALUES ${imageValues}`, 
        [productResult.rows[0].id, ...filePaths]
      );
    }

    await data.dbConnection.query(`
      DELETE FROM products_categories WHERE product_id = $1`,
      [productResult.rows[0].id]
    );

    if (categories.length > 0) {
      const categoryValues = categories
        .map((category, index) => `($1, $${index + 2})`)
        .join(",");
      await data.dbConnection.query(`
        INSERT INTO products_categories(product_id, category_id) VALUES ${categoryValues}`,
        [productResult.rows[0].id, ...categories]
      );
    }

    return productResult.rows[0];
  }
  
  async delete(data) {
    const schema = data.entitySchemaCollection["products"];

    if (schema.relationships) {
      for (const relationship of Object.values(schema.relationships)) {
        await data.dbConnection.query(`
          DELETE FROM ${relationship.table} WHERE ${relationship.foreign_key} = $1`,
          [data.params.id]
        );
      }
    }
    const result = await data.dbConnection.query(
      `DELETE FROM ${schema.name} WHERE id = $1 RETURNING *`,
      [data.params.id]
    );

    return result.rows[0];
  }

  async handleFileUploads(req) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const filePaths = [];

    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: req.headers });

      bb.on('field', (fieldname, value) => {
        req.body[fieldname] = value;
      });

      bb.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(filename);
        if(! filename.filename) {
          file.resume();
          return;
        }

        const imageName = crypto.randomBytes(20).toString('hex');
        const saveTo = path.join(__dirname, '..', '..','..', "images", `${imageName}.${filename.mimeType.split('/')[1]}`);
        filePaths.push('/images/' + imageName + '.' + filename.mimeType.split('/')[1]);
        const writeStream = fs.createWriteStream(saveTo);

        let fileSize = 0;
        file.on('data', async (chunk) => {
        fileSize += chunk.length;
        if (fileSize > MAX_FILE_SIZE) {
          file.unpipe(writeStream); // Stop writing to the file
          writeStream.end(); // End the stream
          await fs.promises.unlink(saveTo);
          return reject(new UserError(`${filename.filename} exceeds the limit of 5 MB`,  7,));
        }});

        file.pipe(writeStream);

        writeStream.on('finish', () => {
        });

        writeStream.on('error', (err) => {
          reject(err);
        });
      });

      bb.on('finish', () => {
        resolve(filePaths);
      });

      req.pipe(bb);
    });
  }
}

module.exports = ProductService;