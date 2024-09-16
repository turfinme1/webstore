const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("./dbConfig");

async function downloadImage(url, filePath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const writer = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    response.body.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function generateHash() {
  return crypto.randomBytes(8).toString("hex");
}

async function insertProduct(client, product) {
  try {
    // Insert the product into the products table
    const productInsertQuery = `
            INSERT INTO products (name, price, short_description, long_description)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
    const productResult = await client.query(productInsertQuery, [
      product.name,
      product.price,
      product.short_description,
      product.long_description,
    ]);

    const productId = productResult.rows[0].id;

    // Insert the categories into the products_categories table
    for (const category of product.category) {
      const categoryQuery = `
                INSERT INTO products_categories (product_id, category_id)
                SELECT $1, id FROM categories WHERE name = $2;
            `;
      await client.query(categoryQuery, [productId, category]);
    }

    // Download images and insert them into the images table
    for (const imageUrl of product.images) {
      const imageHash = generateHash();
      const imagePath = `/images/${imageHash}.jpg`;
      const fullImagePath = path.join(
        __dirname,
        "..",
        "public",
        "images",
        `${imageHash}.jpg`
      );

      // Download the image
      await downloadImage(imageUrl, fullImagePath);

      // Insert the image record into the images table
      const imageQuery = `
                INSERT INTO images (product_id, url)
                VALUES ($1, $2);
            `;
      await client.query(imageQuery, [productId, imagePath]);
    }

    console.log(`Inserted product ${product.name} with ID: ${productId}`);
  } catch (err) {
    console.error(`Error inserting product: ${product.name}`, err);
  }
}

async function insertProducts() {
  // Read products data from JSON file
  const productsData = fs.readFileSync("products.json", "utf-8");
  const products = JSON.parse(productsData);

  // Connect to the database
  const client = await pool.connect();

  // Ensure the images folder exists
  if (!fs.existsSync(path.join(__dirname, "..", "public", "images"))) {
    fs.mkdirSync(path.join(__dirname, "images"));
  }

  // Insert each product
  for (const product of products) {
    await insertProduct(client, product);
  }

  // Close the database connection
  client.release();
}

insertProducts()
  .then(() => console.log("Finished inserting products."))
  .catch((err) => console.error("Error inserting products", err));
