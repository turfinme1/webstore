export const municipalitySchema = {
  type: "object",
  name: "municipality",
  routeName: "municipalities",
  properties: {
    municipality_code: {
      type: "string",
      minLength: 5,
      pattern: "^[a-zA-Z0-9]+$",
      errorMessage: {
        minLength: "Municipality code must be at least 5 characters long.",
        pattern:
          "Municipality code must contain only Latin letters and digits.",
      },
    },
    name_en: {
      type: "string",
      minLength: 3,
      pattern: "^[a-zA-Z ]+$",
      errorMessage: {
        minLength: "Name (EN) must be at least 3 characters long.",
        pattern: "Name (EN) must contain only Latin letters and spaces.",
      },
      searchable: true,
    },
    name: {
      type: "string",
      minLength: 3,
      pattern: "^[а-яА-Я ]+$",
      errorMessage: {
        minLength: "Name must be at least 3 characters long.",
        pattern: "Name must contain only Cyrillic letters and spaces.",
      },
      searchable: true,
    },
    region_id: {
      type: "string",
      minLength: 1,
      pattern: "^[0-9]+$",
      errorMessage: {
        minLength: "Region ID must not be empty.",
        pattern: "Region ID must contain only digits.",
      },
    },
  },
  required: ["municipality_code", "name_en", "name", "region_id"],
  additionalProperties: false,
  errorMessage: {
    required: {
      municipality_code: "Municipality code is required.",
      name_en: "Name (EN) is required.",
      name: "Name is required.",
      region_id: "Region ID is required.",
    },
    additionalProperties: "No additional properties are allowed.",
  },
};
