const { default: Ajv } = require("ajv");
const { ASSERT_USER } = require("./assert");
const STATUS_CODES = require("./constants");

function validateQueryParams(req, schema) { 
  ASSERT_USER(schema, "Invalid query parameters", STATUS_CODES.INVALID_QUERY_PARAMS);

  let searchParams = req.query.searchParams ? JSON.parse(req.query.searchParams) : {};
  ASSERT_USER(typeof searchParams === schema.searchParams.type, "searchParams should be an object", STATUS_CODES.INVALID_QUERY_PARAMS);

  let filterParams = req.query.filterParams ? JSON.parse(req.query.filterParams) : {};
  ASSERT_USER(typeof filterParams === schema.filterParams.type, "filterParams should be an object", STATUS_CODES.INVALID_QUERY_PARAMS);

  let orderParams = req.query.orderParams ? JSON.parse(req.query.orderParams) : [];
  ASSERT_USER(Array.isArray(orderParams), "orderParams should be an array", STATUS_CODES.INVALID_QUERY_PARAMS);

  let groupParams = req.query.groupParams ? JSON.parse(req.query.groupParams) : [];
  ASSERT_USER(Array.isArray(groupParams), "groupParams should be an array", STATUS_CODES.INVALID_QUERY_PARAMS);

  Object.keys(searchParams).forEach(key => {
    const expectedType = schema.searchParams.properties[key]?.type;
    ASSERT_USER(expectedType, `Invalid search parameter: ${key}`, STATUS_CODES.INVALID_QUERY_PARAMS);
    ASSERT_USER(typeof searchParams[key] === expectedType, `${key} should be of type ${expectedType}`, STATUS_CODES.INVALID_QUERY_PARAMS);
  });

  Object.keys(filterParams).forEach(key => {
    ASSERT_USER(schema.filterParams.properties[key], `Invalid filter parameter: ${key}`, STATUS_CODES.INVALID_QUERY_PARAMS);

    const paramValue = filterParams[key];
    if (key === "categories") {
      ASSERT_USER(Array.isArray(paramValue), "categories should be an array", STATUS_CODES.INVALID_QUERY_PARAMS);
      paramValue.forEach(cat => ASSERT_USER(typeof cat === "string", "Each category should be a string", STATUS_CODES.INVALID_QUERY_PARAMS));
    }

    if (key === "price") {
      ASSERT_USER(typeof paramValue === "object", "price should be an object", STATUS_CODES.INVALID_QUERY_PARAMS);
      const { min, max } = paramValue;
      if (min) {
        ASSERT_USER(typeof min === "number", "min should be a number", STATUS_CODES.INVALID_QUERY_PARAMS);
      }
      if (max) {
        ASSERT_USER(typeof max === "number", "max should be a number", STATUS_CODES.INVALID_QUERY_PARAMS);
      }

      if (min && max) {
        ASSERT_USER(min <= max, "min price should be less than or equal to max price", STATUS_CODES.INVALID_QUERY_PARAMS);
      }
    }

    if(key === "country_id"){
      filterParams[key] = paramValue.split(",");
    }

    if(schema.filterParams.properties[key].type === "integer"){
      if(paramValue !== "") {
        filterParams[key] = parseInt(paramValue);
        ASSERT_USER(!isNaN(filterParams[key]), `${key} should be an integer`, STATUS_CODES.INVALID_QUERY_PARAMS);
      }
    }
  });
  
  groupParams.forEach(groupParam => {
    const groupColumn = schema.groupParams.properties[groupParam.column];
    ASSERT_USER(groupColumn, `Invalid group parameter: ${groupParam.column}`, STATUS_CODES.INVALID_QUERY_PARAMS);
  });

  const validDirections = ["ASC", "DESC"];
  orderParams.forEach(([key, direction]) => {
    const schemaOrder = schema.orderParams.properties[key];
    ASSERT_USER(schemaOrder, `Invalid order parameter: ${key}`, STATUS_CODES.INVALID_QUERY_PARAMS);
    ASSERT_USER(validDirections.includes(direction.toUpperCase()), `Invalid order direction: ${direction}`, STATUS_CODES.INVALID_QUERY_PARAMS);
  });
  
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
  ASSERT_USER(typeof pageSize === "number", "pageSize should be a number", STATUS_CODES.INVALID_QUERY_PARAMS);
  ASSERT_USER(pageSize >= schema.pageSize.minimum, `pageSize should be greater than or equal to ${schema.pageSize.minimum}`, STATUS_CODES.INVALID_QUERY_PARAMS);
  ASSERT_USER(pageSize <= schema.pageSize.maximum, `pageSize should be less than or equal to ${schema.pageSize.maximum}`, STATUS_CODES.INVALID_QUERY_PARAMS);

  const page = req.query.page ? parseInt(req.query.page) : 1;
  ASSERT_USER(typeof page === "number", "page should be a number", STATUS_CODES.INVALID_QUERY_PARAMS);
  ASSERT_USER(page >= schema.page.minimum, `page should be greater than or equal to ${schema.page.minimum}`, STATUS_CODES.INVALID_QUERY_PARAMS);

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
  ASSERT_USER(isValid, "Invalid body data", STATUS_CODES.INVALID_BODY);
}

module.exports = { validateQueryParams, validateBody };