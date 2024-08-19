export const regionSchema = {
  type: "object",
  name: "region",
  routeName: "regions",
  properties: {
    region_code: {
      type: "string",
      minLength: 3,
      pattern: "^[a-zA-Z0-9]+$",
      label: "Region Code",
      placeholder: "Enter Region Code",
      errorMessage: {
        minLength: "Region code must be at least 3 characters long.",
        pattern: "Region code must contain only Latin letters and digits.",
      },
    },
    name_en: {
      type: "string",
      minLength: 3,
      pattern: "^[a-zA-Z ]+$",
      label: "Name (EN)",
      placeholder: "Enter Name (EN)",
      searchable: true,
      errorMessage: {
        minLength: "Name (EN) must be at least 3 characters long.",
        pattern: "Name (EN) must contain only Latin letters and spaces.",
      },
    },
    name: {
      type: "string",
      minLength: 3,
      pattern: "^[а-яА-Я ]+$",
      label: "Name",
      placeholder: "Enter Name",
      searchable: true,
      errorMessage: {
        minLength: "Name must be at least 3 characters long.",
        pattern: "Name must contain only Cyrillic letters and spaces.",
      },
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
