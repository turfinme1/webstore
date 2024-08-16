export const townHallSchema = {
  type: "object",
  name: "town_hall",
  routeName: "townhalls",
  properties: {
    town_hall_code: {
      type: "string",
      minLength: 8,
      pattern: "^[A-Z]{3,}[0-9]{2,}-\\d{2,}$",
      errorMessage: {
        minLength: "Town hall code must be at least 8 characters long.",
        pattern: "Town hall code must follow the pattern ABC99-22.",
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
    municipality_id: {
      type: "string",
      minLength: 1,
      pattern: "^[0-9]+$",
      errorMessage: {
        minLength: "Municipality ID must not be empty.",
        pattern: "Municipality ID must contain only digits.",
      },
    },
  },
  required: ["town_hall_code", "name_en", "name", "municipality_id"],
  additionalProperties: false,
  errorMessage: {
    required: {
      town_hall_code: "Town hall code is required.",
      name_en: "Name (EN) is required.",
      name: "Name is required.",
      municipality_id: "Municipality ID is required.",
    },
    additionalProperties: "No additional properties are allowed.",
  },
};