export const regionSchema = {
  type: "object",
  name: "region",
  routeName: "regions",
  properties: {
    region_code: {
      type: "string",
      minLength: 3,
      pattern: "^[a-zA-Z0-9]+$",
      errorMessage: {
        minLength: "Region code must be at least 3 characters long.",
        pattern: "Region code must contain only Latin letters and digits.",
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
  },
  required: ["region_code", "name_en", "name"],
  additionalProperties: false,
  errorMessage: {
    required: {
      region_code: "Region code is required.",
      name_en: "Name (EN) is required.",
      name: "Name is required.",
    },
    additionalProperties: "No additional properties are allowed.",
  },
};
