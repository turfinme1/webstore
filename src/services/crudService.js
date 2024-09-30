const fs = require('fs');
const path = require('path');
const busboy = require('busboy');
const crypto = require('crypto');
const bcrypt = require("bcrypt");

class CrudService {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.handleFileUploads = this.handleFileUploads.bind(this);
  }

  // async create(data) {
  //   const schema = data.entitySchemaCollection[data.params.entity];
  //   const keys = Object.keys(schema.properties);

  //   const filePaths = await this.handleFileUploads(data.req);
  //   const values = keys.map((key) => data.body[key]);
  //   const categories = JSON.parse(data.body.categories);
  //   const query = `INSERT INTO ${schema.name}(${keys.join(",")}) VALUES(${keys
  //     .map((_, i) => `$${i + 1}`)
  //     .join(",")}) RETURNING *`;

  //   const productResult = await data.dbConnection.query(query, values);
    
  //   if (categories.length > 0) {
  //     const categoryValues = categories
  //       .map((category, index) => `($1, $${index + 2})`)
  //       .join(",");
  //     const categoryQuery = `INSERT INTO products_categories(product_id, category_id) VALUES ${categoryValues}`;
  //     await data.dbConnection.query(categoryQuery, [productResult.rows[0].id, ...categories]);
  //   }

  //   for (const filePath of filePaths) {
  //     await data.dbConnection.query(
  //       `INSERT INTO images(product_id, url) VALUES($1, $2)`,
  //       [productResult.rows[0].id, filePath]
  //     );
  //   }

  //   return productResult.rows[0];
  // }

  async create(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    const keys = Object.keys(schema.properties);

    if(data.body.password_hash){
      data.body.password_hash = await bcrypt.hash(data.body.password_hash, 10);
    }
    const values = keys.map((key) => data.body[key]);

    const query = `INSERT INTO ${schema.name}(${keys.join(",")}) VALUES(${keys
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;

    const result = await data.dbConnection.query(query, values);

    return result.rows;
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

  // async update(data) {
  //   const schema = data.entitySchemaCollection[data.params.entity];
  //   const filePaths = await this.handleFileUploads(data.req);
  //   const categories = JSON.parse(data.body.categories);
  //   const imagesToDelete = JSON.parse(data.body.imagesToDelete);

  //   const keys = Object.keys(schema.properties);
  //   const values = keys.map((key) => data.body[key]);
  //   let query = `UPDATE ${schema.name} SET ${keys
  //     .map((key, i) => `${key} = $${i + 1}`)
  //     .join(", ")}`;
  //   query += ` WHERE id = $${keys.length + 1} RETURNING *`;

  //   const productResult = await data.dbConnection.query(query, [...values, data.params.id]);
    
  //   for (const image of imagesToDelete) {
  //     const imageName = image.split('/').pop().split('.')[0];
  //     const imagePath = path.join(__dirname, '..', '..', '..', 'images', `${imageName}.${image.split('.').pop()}`);
  //     await fs.promises.unlink(imagePath);
  //     await data.dbConnection.query(
  //       `DELETE FROM images WHERE url = $1`,
  //       [image]
  //     );
  //   }

  //   if (filePaths.length > 0) {
  //     const imageValues = filePaths
  //       .map((filePath, index) => `($1, $${index + 2})`)
  //       .join(",");
  //     await data.dbConnection.query(`
  //       INSERT INTO images(product_id, url) VALUES ${imageValues}`, 
  //       [productResult.rows[0].id, ...filePaths]
  //     );
  //   }

  //   await data.dbConnection.query(`
  //     DELETE FROM products_categories WHERE product_id = $1`,
  //     [productResult.rows[0].id]
  //   );

  //   if (categories.length > 0) {
  //     const categoryValues = categories
  //       .map((category, index) => `($1, $${index + 2})`)
  //       .join(",");
  //     await data.dbConnection.query(`
  //       INSERT INTO products_categories(product_id, category_id) VALUES ${categoryValues}`,
  //       [productResult.rows[0].id, ...categories]
  //     );
  //   }

  //   return productResult.rows[0];
  // }

  async update(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    let keys = Object.keys(schema.properties);

    if(data.body.password_hash){
      data.body.password_hash = await bcrypt.hash(data.body.password_hash, 10);
    } else {
      keys = keys.filter(key => key !== 'password_hash');
    }

    const values = keys.map((key) => data.body[key]);
    let query = `UPDATE ${schema.name} SET ${keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ")}`;
    query += ` WHERE id = $${keys.length + 1} RETURNING *`;

    const result = await data.dbConnection.query(query, [...values, data.params.id]);

    return result.rows[0];
  }

  async delete(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    await this.deleteRelationships(data, schema, data.params.id);

    const result = await data.dbConnection.query(
      `DELETE FROM ${schema.name} WHERE id = $1 RETURNING *`,
      [data.params.id]
    );

    return result.rows[0];
  }

  async deleteRelationships(data, schema, parentId) {
    if (!schema.relationships) return;  

    for (const relationship of Object.values(schema.relationships)) {
      // If there are nested relationships, delete them first
      if (relationship.nested_relationships) {
        const nestedSchema = {
          relationships: relationship.nested_relationships
        };
        
        // Query to get all the related entity ids for the nested relationships
        const relatedEntities = await data.dbConnection.query(
          `SELECT id FROM ${relationship.table} WHERE ${relationship.foreign_key} = $1`,
          [parentId]
        );

        // Recursively delete the nested relationships for each related entity
        for (const relatedEntity of relatedEntities.rows) {
          await this.deleteRelationships(data, nestedSchema, relatedEntity.id);
        }
      }

      // Delete the current relationship entries
      await data.dbConnection.query(
        `DELETE FROM ${relationship.table} WHERE ${relationship.foreign_key} = $1`,
        [parentId]
      );
    }
  }

  async handleFileUploads(req) {
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

module.exports = CrudService;