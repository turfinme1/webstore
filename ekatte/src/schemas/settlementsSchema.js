 const settlementsSchema = {
  type: "object",
  name: "settlement",
  routeName: "settlements",
  views: "settlement_view",
  properties: {
    ekatte: {
      type: "string",
      minLength: 5,
      pattern: "^[0-9]+$",
      label: "Ekatte Code",
      placeholder: "Enter Ekatte Code",
      errorMessage: {
        minLength: "Ekatte code must be at least 5 characters long.",
        pattern: "Ekatte code must contain only digits.",
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
    town_hall_id: {
      type: "string",
      minLength: 1,
      pattern: "^[0-9]+$",
      label: "Town Hall",
      placeholder: "Enter Town Hall",
      routeName: "townhalls",
      errorMessage: {
        minLength: "Town hall ID must not be empty.",
        pattern: "Town hall ID must contain only digits.",
      },
    },
  },
  displayProperties: {
    ekatte: {
      label: "Ekatte Code",
    },
    name_en: {
      label: "Name (EN)",
    },
    name: {
      label: "Name",
    },
    town_hall_name: {
      label: "Town Hall Name",
    },
    town_hall_name_en: {
      label: "Town Hall Name (EN)",
    },
  },
  required: ["ekatte", "name_en", "name", "town_hall_id"],
  additionalProperties: false,
  errorMessage: {
    required: {
      ekatte: "Ekatte code is required.",
      name_en: "Name (EN) is required.",
      name: "Name is required.",
      town_hall_id: "Town hall ID is required.",
    },
    additionalProperties: "No additional properties are allowed.",
  },
};

export default settlementsSchema;