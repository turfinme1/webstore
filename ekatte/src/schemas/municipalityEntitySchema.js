export const municipalitySchema = {
  type: "object",
  name: "municipality",
  routeName: "municipalities",
  views: "municipality_view",
  properties: {
    municipality_code: {
      type: "string",
      minLength: 5,
      pattern: "^[a-zA-Z0-9]+$",
      label: "Municipality Code",
      placeholder: "Enter Municipality Code",
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
    region_id: {
      type: "string",
      minLength: 1,
      pattern: "^[0-9]+$",
      label: "Region ID",
      placeholder: "Enter Region ID",
      errorMessage: {
        minLength: "Region ID must not be empty.",
        pattern: "Region ID must contain only digits.",
      },
    },
  },
  displayProperties: {
    municipality_code: {
      label: "Municipality Code",
    },
    name_en: {
      label: "Name (EN)",
    },
    name: {
      label: "Name",
    },
    region_name: {
      label: "Region Name",
    },
    region_name_en: {
      label: "Region Name (EN)",
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
