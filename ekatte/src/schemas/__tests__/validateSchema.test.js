import { validateSchema } from "../validateSchema.js";
import { jest } from "@jest/globals";

describe("validateSchema", () => {
  let schema;

  beforeEach(() => {
    schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer", minimum: 0 },
        email: { type: "string", format: "email" },
      },
      required: ["name", "age", "email"],
      additionalProperties: false,
    };
  });

  it("should validate correctly and not throw for valid data", () => {
    const validData = {
      name: "John Doe",
      age: 30,
      email: "johndoe@example.com",
    };

    expect(() => validateSchema(schema, validData)).not.toThrow();
  });

  it("should throw an error for invalid data", () => {
    const invalidData = {
      name: "John Doe",
      age: -5,
      email: "invalid-email",
    };

    try {
      validateSchema(schema, invalidData);
    } catch (error) {
      expect(error).toEqual({
        errors: {
          age: ["must be >= 0"],
          email: ['must match format "email"'],
        },
      });
    }
  });

  it("should throw an error when required fields are missing", () => {
    const missingFieldsData = {
      name: "John Doe",
      age: 30,
    };

    try {
      validateSchema(schema, missingFieldsData);
    } catch (error) {
      expect(error).toEqual({
        errors: {
          "": ["must have required property 'email'"],
        },
      });
    }
  });

  it("should throw an error when additional properties are present", () => {
    const additionalPropsData = {
      name: "John Doe",
      age: 30,
      email: "johndoe@example.com",
      extraField: "extra",
    };

    try {
      validateSchema(schema, additionalPropsData);
    } catch (error) {
      expect(error).toEqual({
        errors: {
          "": ["must NOT have additional properties"],
        },
      });
    }
  });

  it("should handle a complex schema with nested objects and arrays", () => {
    const complexSchema = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "integer", minimum: 0 },
          },
          required: ["name", "age"],
        },
        tags: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
      },
      required: ["user", "tags"],
      additionalProperties: false,
    };

    const invalidData = {
      user: { name: "Jane Doe" },
      tags: [],
    };

    try {
      validateSchema(complexSchema, invalidData);
    } catch (error) {
      expect(error).toEqual({
        errors: {
          user: ["must have required property 'age'"],
          tags: ["must NOT have fewer than 1 items"],
        },
      });
    }
  });
});
