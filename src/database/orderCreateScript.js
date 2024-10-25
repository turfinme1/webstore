const { faker } = require("@faker-js/faker");
const pool = require("./dbConfig");

const users = [
  "2", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  "20", "21", "22", "23", "24", "25", "26", "27", "28",
  "29", "30", "31", "32", "33", "34", "35", "36", "37",
  "38", "39", "40", "41", "42", "43", "44", "45", "46",
  "47", "48", "49", "50", "51", "52", "53", "54", "55",
  "56", "57", "58", "60", "62", "63", "64", "65", "66",
  "67",
];

function generateOrderItems() {
  const numItems = Math.floor(Math.random() * 10) + 1;
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const productId = Math.floor(Math.random() * (49000 - 200 + 1)) + 200;
    const unitPrice = parseFloat(
      faker.commerce.price({ min: 10, max: 1000, dec: 2 })
    );
    const quantity = Math.floor(Math.random() * 10) + 1;

    items.push({
      product_id: productId,
      quantity,
      unit_price: unitPrice,
    });
  }

  return items;
}

// Generates random orders
function generateOrders(numOrders, users) {
  const orders = [];

  for (let i = 0; i < numOrders; i++) {
    const userId = faker.helpers.arrayElement(users);
    const status = faker.helpers.arrayElement([
      "Pending",
      "Paid",
      "Delivered",
      "Cancelled",
    ]);
    const createdAt = faker.date.past(1);

    const orderItems = generateOrderItems();
    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    const paidAmount = status === "Paid" ? totalPrice : 0;

    orders.push({
      user_id: userId,
      status: status,
      total_price: totalPrice,
      created_at: createdAt,
      is_active: true,
      paid_amount: paidAmount,
      order_items: orderItems,
    });
  }

  return orders;
}

// Batch insert orders and order items
async function saveOrders(numOrders, users, batchSize = 1000) {
  const client = await pool.connect();
  try {
    for (let offset = 0; offset < numOrders; offset += batchSize) {
      const currentBatchSize = Math.min(batchSize, numOrders - offset);
      const orders = generateOrders(currentBatchSize, users);

      await client.query("BEGIN");

      const orderValues = [];
      const orderParams = [];
      let paramIndex = 1;

      orders.forEach((order) => {
        orderValues.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );
        orderParams.push(
          order.user_id,
          order.status,
          order.total_price,
          order.created_at,
          order.is_active,
          order.paid_amount
        );
      });

      const ordersInsertQuery = `
        INSERT INTO orders (user_id, status, total_price, created_at, is_active, paid_amount)
        VALUES ${orderValues.join(", ")}
        RETURNING id;
      `;

      const ordersResult = await client.query(ordersInsertQuery, orderParams);
      const insertedOrderIds = ordersResult.rows.map((row) => row.id);

      const orderItemsValues = [];
      const orderItemsParams = [];
      paramIndex = 1;

      orders.forEach((order, idx) => {
        const orderId = insertedOrderIds[idx];
        order.order_items.forEach((item) => {
          orderItemsValues.push(
            `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
          );
          orderItemsParams.push(
            orderId,
            item.product_id,
            item.quantity,
            item.unit_price
          );
        });
      });

      if (orderItemsValues.length > 0) {
        const orderItemsInsertQuery = `
          INSERT INTO order_items (order_id, product_id, quantity, unit_price)
          VALUES ${orderItemsValues.join(", ")};
        `;
        await client.query(orderItemsInsertQuery, orderItemsParams);
      }

      await client.query("COMMIT");

      console.log(
        `Inserted batch ${Math.floor(offset / batchSize) + 1} with ${currentBatchSize} orders`
      );
    }
    console.log("All orders have been inserted successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error inserting orders:", error);
  } finally {
    client.release();
  }
}

const numOrders = 1000000;
saveOrders(numOrders, users, 2900).catch(console.error);
