const { default: Ajv } = require("ajv");
const { ASSERT_USER, ASSERT } = require("./assert");

function validateQueryParams(req, schema) { 
  ASSERT_USER(schema, "Invalid query parameters", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

  let searchParams = req.query.searchParams ? JSON.parse(req.query.searchParams) : {};
  ASSERT_USER(typeof searchParams === schema.searchParams.type, "searchParams should be an object", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

  let filterParams = req.query.filterParams ? JSON.parse(req.query.filterParams) : {};
  ASSERT_USER(typeof filterParams === schema.filterParams.type, "filterParams should be an object", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

  let orderParams = req.query.orderParams ? JSON.parse(req.query.orderParams) : [];
  ASSERT_USER(Array.isArray(orderParams), "orderParams should be an array", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

  let groupParams = req.query.groupParams ? JSON.parse(req.query.groupParams) : [];
  ASSERT_USER(Array.isArray(groupParams), "groupParams should be an array", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

  Object.keys(searchParams).forEach(key => {
    const expectedType = schema.searchParams.properties[key]?.type;
    ASSERT_USER(expectedType, `Invalid search parameter: ${key}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
    ASSERT_USER(typeof searchParams[key] === expectedType, `${key} should be of type ${expectedType}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
  });

  Object.keys(filterParams).forEach(key => {
    ASSERT_USER(schema.filterParams.properties[key], `Invalid filter parameter: ${key}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

    const paramValue = filterParams[key];
    if (key === "categories") {
      ASSERT_USER(Array.isArray(paramValue), "categories should be an array", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
      paramValue.forEach(cat => ASSERT_USER(typeof cat === "string", "Each category should be a string", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" }));
    }

    if (key === "price") {
      ASSERT_USER(typeof paramValue === "object", "price should be an object", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
      const { min, max } = paramValue;
      if (min) {
        ASSERT_USER(typeof min === "number", "min should be a number", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
      }
      if (max) {
        ASSERT_USER(typeof max === "number", "max should be a number", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
      }

      if (min && max) {
        ASSERT_USER(min <= max, "min price should be less than or equal to max price", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
      }
    }

    if(key === "country_id"){
      filterParams[key] = paramValue.split(",");
    }

    if(schema.filterParams.properties[key].type === "integer"){
      if(paramValue !== "") {
        filterParams[key] = parseInt(paramValue);
        ASSERT_USER(!isNaN(filterParams[key]), `${key} should be an integer`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
      }
    }
  });
  
  groupParams.forEach(groupParam => {
    const groupColumn = schema.groupParams.properties[groupParam.column];
    ASSERT_USER(groupColumn, `Invalid group parameter: ${groupParam.column}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
  });

  const validDirections = ["ASC", "DESC"];
  orderParams.forEach(([key, direction]) => {
    const schemaOrder = schema.orderParams.properties[key];
    ASSERT_USER(schemaOrder, `Invalid order parameter: ${key}`, { code: "VALIDATION_INVALID_QUERY_PARAMS"
, long_description: "Invalid query parameters" });
    ASSERT_USER(validDirections.includes(direction.toUpperCase()), `Invalid order direction: ${direction}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
  });
  
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
  ASSERT_USER(typeof pageSize === "number", "pageSize should be a number", { code: "VALIDATION_INVALID_QUERY_PARAMS"
, long_description: "Invalid query parameters" });
  ASSERT_USER(pageSize >= schema.pageSize.minimum, `pageSize should be greater than or equal to ${schema.pageSize.minimum}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
  ASSERT_USER(pageSize <= schema.pageSize.maximum, `pageSize should be less than or equal to ${schema.pageSize.maximum}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

  const page = req.query.page ? parseInt(req.query.page) : 1;
  ASSERT_USER(typeof page === "number", "page should be a number", { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });
  ASSERT_USER(page >= schema.page.minimum, `page should be greater than or equal to ${schema.page.minimum}`, { code: "VALIDATION_INVALID_QUERY_PARAMS", long_description: "Invalid query parameters" });

  req.query.searchParams = searchParams;
  req.query.filterParams = filterParams;
  req.query.orderParams = orderParams;
  req.query.groupParams = groupParams;
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
  ASSERT_USER(isValid, "Invalid body data", { code: "VALIDATION_INVALID_BODY", long_description: "Invalid body data" });
}

function validateObject(object, schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const isValid = validate(object);
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
  let formattedErrors = "";
  for (const key in errors) {
    formattedErrors += `${errors[key].join(", ")}\n`;
  }
  ASSERT(isValid, `Validation error for ${schema.name} object`, { code: "VALIDATION_INVALID_INPUT", long_description: `Validation error for ${schema.name}: ${formattedErrors}` });
}

module.exports = { validateQueryParams, validateBody, validateObject };