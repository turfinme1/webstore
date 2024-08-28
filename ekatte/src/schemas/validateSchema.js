import Ajv from "ajv";
import addFormats from "ajv-formats";
import addErrors from "ajv-errors";
import { ASSERT_USER } from "../util/requestUtilities.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
addErrors(ajv);

export function validateSchema(schema, data) {
  const validate = ajv.compile(schema);
  const isValid = validate(data);
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

  ASSERT_USER(isValid, 422, errors);
}
