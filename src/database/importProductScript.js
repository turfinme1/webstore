const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const pool = require("./dbConfig");

async function downloadImage(url, filePath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  await fs.writeFile(filePath, buffer);
}

function generateHash() {
  return crypto.randomBytes(8).toString("hex");
}

async function insertProduct(client, product) {
  try {
    const productInsertQuery = `
      INSERT INTO products (name, price, short_description, long_description)
      VALUES ($1, $2, $3, $4)
      RETURNING id;`;
    const productResult = await client.query(productInsertQuery, [
      product.name,
      product.price,
      product.short_description,
      product.long_description,
    ]);

    const productId = productResult.rows[0].id;
    
    const categoryQuery = `
      INSERT INTO products_categories (product_id, category_id)
      SELECT $1, id FROM categories WHERE name = $2;
    `;
    const categoryInsertPromises = product.category.map(async (category) => {
      await client.query(categoryQuery, [productId, category]);
    });
    await Promise.all(categoryInsertPromises);

    const imageInsertPromises = product.images.map(async (imageUrl) => {
      const imageHash = generateHash();
      const imagePath = `/images/${imageHash}.jpg`;
      const fullImagePath = path.join(__dirname, "..", "..", "..", "images", `${imageHash}.jpg`);

      await downloadImage(imageUrl, fullImagePath);

      const imageQuery = `
        INSERT INTO images (product_id, url)
        VALUES ($1, $2);`;
      await client.query(imageQuery, [productId, imagePath]);
    });
    await Promise.all(imageInsertPromises);

    console.log(`Inserted product ${product.name} with ID: ${productId}`);
  } catch (err) {
    console.error(`Error inserting product: ${product.name}`, err);
  }
}

async function insertProducts() {
  const productsData = await fs.readFile("products.json", "utf-8");
  const products = JSON.parse(productsData);

  const client = await pool.connect();

  const productInsertPromises = products.map((product) => insertProduct(client, product));
  await Promise.all(productInsertPromises);

  client.release();
}

insertProducts()
  .then(() => console.log("Finished inserting products."))
  .catch((err) => console.error("Error inserting products", err));