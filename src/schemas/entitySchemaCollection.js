const fs = require("fs");
const path = require("path");

function loadEntitySchemas() {
  const files = fs.readdirSync(path.join(__dirname));
  const schemas = files.reduce((acc, file) => {
    if (file.endsWith("Schema.js")) {
      const schema = require(path.join(__dirname, file));
      acc[schema.routeName] = schema;
    }
    return acc;
  }, {});

  return schemas;
}

const entitySchemaCollection = loadEntitySchemas();

module.exports = entitySchemaCollection;