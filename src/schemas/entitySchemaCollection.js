const fs = require("fs");
const path = require("path");

function loadEntitySchemas(context) {
  const files = fs.readdirSync(path.join(__dirname));
  const schemas = files.reduce((acc, file) => {
    if (file.endsWith("Schema.json")) {
      const schema = require(path.join(__dirname, file));

      if (schema[context]) {
        acc[schema.name] = schema[context];
      } else {
        acc[schema.name] = schema;
      }
    }
    
    return acc;
  }, {});

  return schemas;
}

module.exports = {
  loadEntitySchemas,
};
