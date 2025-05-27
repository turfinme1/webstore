const fs = require('fs');
const path = require('path');
const busboy = require('busboy');
const crypto = require('crypto');
const { UserError } = require('../serverConfigurations/assert');
const fetch = require("node-fetch");

class ProductService {
  constructor() {
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
          if(property === 'name') {
            property = 'products.name';
          }
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
        `c.name IN (${categoryPlaceholders})`
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
        : "";
    
    const dataQuery = `
      WITH top_products AS (
          SELECT products.id, code, products.name, price, short_description, long_description
          FROM products
          JOIN products_categories pc ON pc.product_id = products.id
          JOIN categories c ON pc.category_id = c.id
          ${combinedConditions}
          GROUP BY products.id
          ${orderByClause !== "" ? `ORDER BY ${orderByClause}` : ""} 
          LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}
      ),
      vat AS (
          SELECT vat_percentage FROM app_settings LIMIT 1
      )
      SELECT 
          p.id,
          p.code,
          p.name,
          p.price,
          inv.quantity,
          p.short_description,
          p.long_description,
          COALESCE(i.urls, ARRAY[]::text[]) AS images,
          COALESCE(c.category_names, ARRAY[]::text[]) AS categories,
          COALESCE(r.avg_rating, 0) AS average_rating,
          COALESCE(r.rating_count, 0) AS rating_count,
          ROUND(p.price * (1 + vat.vat_percentage / 100), 2) AS price_with_vat
      FROM top_products p
      CROSS JOIN vat
      LEFT JOIN (
          SELECT product_id, array_agg(DISTINCT url) AS urls
          FROM images
          WHERE product_id IN (SELECT id FROM top_products)
          GROUP BY product_id
      ) i ON p.id = i.product_id
      LEFT JOIN (
          SELECT pc.product_id, array_agg(DISTINCT c.name) AS category_names
          FROM products_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id IN (SELECT id FROM top_products)
          GROUP BY pc.product_id
      ) c ON p.id = c.product_id
      LEFT JOIN (
          SELECT product_id, AVG(rating) AS avg_rating, COUNT(rating) AS rating_count
          FROM ratings
          WHERE product_id IN (SELECT id FROM top_products)
          GROUP BY product_id
      ) r ON p.id = r.product_id
      LEFT JOIN inventories inv ON p.id = inv.product_id;
      `;
    
    const countQuery = `
          SELECT COUNT(DISTINCT products.id) as count FROM products
          JOIN products_categories pc ON pc.product_id = products.id
          JOIN categories c ON pc.category_id = c.id
          ${combinedConditions}`;

    const totalCount = await data.dbConnection.query(countQuery, searchValues); 
    const result = await data.dbConnection.query(dataQuery, [...searchValues, data.query.pageSize , offset]);
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

  async getQuantity(data) {
    const result = await data.dbConnection.query(`
      SELECT COALESCE((SELECT quantity FROM inventories WHERE product_id = $1), 0) AS quantity`,
      [data.params.id]
    );

    return result.rows[0];
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

    await data.dbConnection.query(
      `INSERT INTO inventories(product_id, quantity) VALUES($1, $2)`,
      [productResult.rows[0].id, data.body.quantity]
    );

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
    const keys = Object.keys(schema.properties);
    const values = keys.map((key) => data.body[key]);
    let query = `UPDATE ${schema.name} SET ${keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ")}`;
    query += ` WHERE id = $${keys.length + 1} RETURNING *`;

    const productResult = await data.dbConnection.query(query, [...values, data.params.id]);

    await data.dbConnection.query(`
      DELETE FROM products_categories WHERE product_id = $1`,
      [productResult.rows[0].id]
    );

    if (data.body.categories.length > 0) {
      const categoryValues = data.body.categories
        .map((category, index) => `($1, $${index + 2})`)
        .join(",");
      await data.dbConnection.query(`
        INSERT INTO products_categories(product_id, category_id) VALUES ${categoryValues}`,
        [productResult.rows[0].id, ...data.body.categories]
      );
    }

    const inventoryResult = await data.dbConnection.query(`
      SELECT * FROM inventories WHERE product_id = $1`,
      [productResult.rows[0].id]
    );

    if (inventoryResult.rows.length === 0) {
      await data.dbConnection.query(`
        INSERT INTO inventories(product_id, quantity) VALUES($1, $2)`,
        [productResult.rows[0].id, data.body.quantity]
      );
    } else {
      
      if (inventoryResult.rows[0].quantity !== data.body.quantity) {
        await data.dbConnection.query(`
          INSERT INTO message_queue (subject, text_content, type, event_type)
          VALUES ($1, $2, $3, $4)`,
          ["Quantity changed", "Product Quantity changed", "Notification", "quantity_update_sync_clients"]
        );
      }

      await data.dbConnection.query(`
        UPDATE inventories SET quantity = $1 WHERE product_id = $2`,
        [data.body.quantity, productResult.rows[0].id]
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

  async uploadProducts(req) {
    let insertedLines = 0;
    let invalidLinesLog = {
      noImage: 0,
      invalidFormat: 0
    }
    for await (const line of this.streamLines(req, invalidLinesLog)) {
      const result = await req.dbConnection.query(`
        INSERT INTO products (code, name, price, short_description, long_description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
        RETURNING *`,
        [line[0], line[1], line[6], line[1], line[1]]
      );
      
      if (result.rows.length === 1) {
        const product = result.rows[0];
        const imageHash = crypto.randomBytes(8).toString("hex");
        const imagePath = `/images/${imageHash}.jpg`;
        const fullImagePath = path.join(__dirname, "..", "..", "..", "images", `${imageHash}.jpg`);

        await req.dbConnection.query(`
          INSERT INTO images (product_id, url)
          VALUES ($1, $2);`,
          [product.id, imagePath]
        );
        
        const response = await fetch(line[2]);
        if (!response.ok) {
          invalidLinesLog.noImage++;
          await req.dbConnection.query(`ROLLBACK`);
          continue;
        }

        const buffer = await response.buffer();
        await fs.promises.writeFile(fullImagePath, buffer);
        await req.dbConnection.query(`COMMIT`);
        insertedLines++;
      }
    }

    return { message: `Success. Inserted ${insertedLines} lines. Rows with no image: ${invalidLinesLog.noImage}, Rows with invalid format: ${invalidLinesLog.invalidFormat}` };
  }

  async* streamLines(stream, invalidLinesLog) {
    let buffer = '';
    let fileStarted = false;
    let isFirstLine = true;
    
    for await (const chunk of stream) {
      buffer += chunk.toString();
      if(!fileStarted) {
        const boundary = '\r\n\r\n';
        const boundaryIndex = buffer.indexOf(boundary);
        buffer = buffer.slice(boundaryIndex+4);
        fileStarted = true;
      }

      if(fileStarted) {
        let lines = buffer.split("\n");
        // Keep the last line in the buffer in case it's incomplete
        buffer = lines.pop();
        
        for (const line of lines) {
          if(line === '\r'){
            break;
          }
          if(isFirstLine){
            isFirstLine = false;
            continue;
          }

          let preparedLine = line.split(',');
          if(preparedLine.length !== 11){
            invalidLinesLog.invalidFormat++;
            continue;
          }

          if(preparedLine[2].includes('No Image')){
            invalidLinesLog.noImage++;
            continue;
          }

          yield preparedLine.map(value => value.trim());
        }
      }
    }
  }

  async uploadImages(req) {
    const filePaths = await this.handleFileUploads(req);
    const imagesToDelete = JSON.parse(req.body.imagesToDelete);

    if (filePaths.length > 0) {
      const imageValues = filePaths
        .map((filePath, index) => `($1, $${index + 2})`)
        .join(",");
      await req.dbConnection.query(`
        INSERT INTO images(product_id, url) VALUES ${imageValues}`, 
        [req.params.id, ...filePaths]
      );
    }

    for (const image of imagesToDelete) {
      const imageName = image.split('/').pop().split('.')[0];
      const imagePath = path.join(__dirname, '..', '..', '..', 'images', `${imageName}.${image.split('.').pop()}`);
      await fs.promises.unlink(imagePath);
      await req.dbConnection.query(
        `DELETE FROM images WHERE url = $1`,
        [image]
      );
    }

    return filePaths;
  }

  async handleFileUploads(req) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    let filePaths = [];
    let fileUploads = [];

    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: req.headers });
     
      bb.on('field', (fieldname, value) => {
        req.body[fieldname] = value;
      });

      bb.on('file', async (fieldname, file, filename, encoding, mimetype) => {
        try {
          if(! filename.filename) {
            file.resume();
            return;
          }

          const fileExtension = filename.mimeType.split('/')[1];
          const imageName = crypto.randomBytes(20).toString('hex');
          const saveTo = path.join(__dirname, '..', '..','..', "images", `${imageName}.${fileExtension}`);
          const filePath  = `/images/${imageName}.${fileExtension}`;
          filePaths.push(filePath);
          const writeStream = fs.createWriteStream(saveTo);

          const fileUploadResult = await req.dbConnection.query(`
            INSERT INTO file_uploads (file_name, file_path, status) 
            VALUES ($1, $2, 'in_progress') 
            RETURNING *`, 
            [imageName, saveTo]
          );
          await req.dbConnection.query(`COMMIT`);
          fileUploads.push(fileUploadResult.rows[0].id);

          let fileSize = 0;
          file.on("data", async (chunk) => {
            try {
              fileSize += chunk.length;
              if (fileSize > MAX_FILE_SIZE) {
                file.unpipe(writeStream); // Stop writing to the file
                writeStream.end(); // End the stream
                await fs.promises.unlink(saveTo);
                return reject(new UserError(`${filename.filename} exceeds the limit of 5 MB`, 7));
              }
            } catch (error) {
              reject(error);
            }
          });

          file.pipe(writeStream);

          writeStream.on('error', (err) => {
            reject(err);
          });
        } catch (error) {
          reject(error);
        }
      });

      bb.on('finish', async () => {
        try {
          await req.dbConnection.query(`
            UPDATE file_uploads
            SET status = 'completed'
            WHERE id = ANY($1)`,
            [fileUploads]
          );
          resolve(filePaths);
        } catch (error) {
          reject(error);
        }
      });

      bb.on('error', async (err) => {
        try {
          await req.dbConnection.query(`
            UPDATE file_uploads
            SET status = 'failed'
            WHERE id = ANY($1)`,
            [fileUploads]
          );
          reject(err);
        } catch (error) {
          reject(error);
        }
      });

      req.pipe(bb);
    });
  }
}

module.exports = ProductService;