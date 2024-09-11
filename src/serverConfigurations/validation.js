const { ASSERT_USER } = require("./assert");

function validateQueryParams(req, schema) {
  ASSERT_USER(schema, "Invalid query parameters");
  let searchParams = req.query.searchParams ? JSON.parse(req.query.searchParams) : {};
  let orderParams = req.query.orderParams ? JSON.parse(req.query.orderParams) : [];

  const invalidSearchParams = Object.keys(searchParams).filter(
    (key) => !schema.seachParams[key]
  );
  ASSERT_USER(invalidSearchParams.length === 0, "Invalid query parameters");

  const validDirections = ["ASC", "DESC"];
  const invalidOrderParams = orderParams.filter(
    ([key, direction]) =>
      !(schema.properties[key] || schema.displayProperties[key]) ||
      !validDirections.includes(direction.toUpperCase())
  );
  ASSERT_USER(invalidOrderParams.length === 0, "Invalid order query parameters");
}

module.exports = { validateQueryParams };
