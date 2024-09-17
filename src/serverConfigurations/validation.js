const { default: Ajv } = require("ajv");
const { ASSERT_USER } = require("./assert");

function validateQueryParams(req, schema) { 
  ASSERT_USER(schema, "Invalid query parameters");

  let searchParams = req.query.searchParams ? JSON.parse(req.query.searchParams) : {};
  ASSERT_USER(typeof searchParams === schema.searchParams.type, "searchParams should be an object");

  let filterParams = req.query.filterParams ? JSON.parse(req.query.filterParams) : {};
  ASSERT_USER(typeof filterParams === schema.filterParams.type, "filterParams should be an object");

  let orderParams = req.query.orderParams ? JSON.parse(req.query.orderParams) : [];
  ASSERT_USER(Array.isArray(orderParams), "orderParams should be an array");

  Object.keys(searchParams).forEach(key => {
    const expectedType = schema.searchParams.properties[key]?.type;
    ASSERT_USER(expectedType, `Invalid search parameter: ${key}`);
    ASSERT_USER(typeof searchParams[key] === expectedType, `${key} should be of type ${expectedType}`);
  });

  Object.keys(filterParams).forEach(key => {
    ASSERT_USER(schema.filterParams.properties[key], `Invalid filter parameter: ${key}`);

    const paramValue = filterParams[key];
    if (key === "categories") {
      ASSERT_USER(Array.isArray(paramValue), "categories should be an array");
      paramValue.forEach(cat => ASSERT_USER(typeof cat === "string", "Each category should be a string"));
    }

    if (key === "price") {
      ASSERT_USER(typeof paramValue === "object", "price should be an object");
      const { min, max } = paramValue;
      if (min) {
        ASSERT_USER(typeof min === "number", "min should be a number");
      }
      if (max) {
        ASSERT_USER(typeof max === "number", "max should be a number");
      }

      if (min && max) {
        ASSERT_USER(min <= max, "min price should be less than or equal to max price");
      }
    }
  });
  
  const validDirections = ["ASC", "DESC"];
  orderParams.forEach(([key, direction]) => {
    const schemaOrder = schema.orderParams.properties[key];
    ASSERT_USER(schemaOrder, `Invalid order parameter: ${key}`);
    ASSERT_USER(validDirections.includes(direction.toUpperCase()), `Invalid order direction: ${direction}`);
  });
  
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
  ASSERT_USER(typeof pageSize === "number", "pageSize should be a number");
  ASSERT_USER(pageSize >= schema.pageSize.minimum, `pageSize should be greater than or equal to ${schema.pageSize.minimum}`);
  ASSERT_USER(pageSize <= schema.pageSize.maximum, `pageSize should be less than or equal to ${schema.pageSize.maximum}`);

  const page = req.query.page ? parseInt(req.query.page) : 1;
  ASSERT_USER(typeof page === "number", "page should be a number");
  ASSERT_USER(page >= schema.page.minimum, `page should be greater than or equal to ${schema.page.minimum}`);

  req.query.searchParams = searchParams;
  req.query.filterParams = filterParams;
  req.query.orderParams = orderParams;
  req.query.pageSize = pageSize;
  req.query.page = page;
}

function validateBody(req, schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const isValid = validate(req.body);
  let errors = {};  

  if (!isValid) {
    for (const error of validate.errors) {
      const key = error.instancePath.replace("/", "");

      if (!errors[key]) {
        errors[key] = [];
      }

      errors[key].push(error.message);
    }
  }
  ASSERT_USER(isValid, "Invalid body data");
  // ASSERT_USER(isValid, JSON.stringify(errors));
}

module.exports = { validateQueryParams, validateBody };