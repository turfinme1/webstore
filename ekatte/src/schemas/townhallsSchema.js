const townhallsSchema = {
  type: "object",
  name: "town_hall",
  routeName: "townhalls",
  views: "town_hall_view",
  properties: {
    town_hall_code: {
      type: "string",
      minLength: 8,
      pattern: "^[A-Z]{3,}[0-9]{2,}-\\d{2,}$",
      label: "Town Hall Code",
      placeholder: "Enter Town Hall Code",
      errorMessage: {
        minLength: "Town hall code must be at least 8 characters long.",
        pattern: "Town hall code must follow the pattern ABC99-22.",
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
    municipality_id: {
      type: "string",
      minLength: 1,
      pattern: "^[0-9]+$",
      label: "Municipality",
      placeholder: "Enter Municipality",
      routeName: "municipalities",
      errorMessage: {
        minLength: "Municipality ID must not be empty.",
        pattern: "Municipality ID must contain only digits.",
      },
    },
  },
  displayProperties: {
    town_hall_code: {
      label: "Town Hall Code",
      placeholder: "Enter Town Hall Code",
      searchable: true,
    },
    name_en: {
      label: "Name (EN)",
      placeholder: "Enter Name (EN)",
      searchable: true,
    },
    name: {
      label: "Name",
      placeholder: "Enter Name",
      searchable: true,
    },
    municipality_name: {
      label: "Municipality Name",
      placeholder: "Enter Municipality Name",
      searchable: true,
    },
    municipality_name_en: {
      label: "Municipality Name (EN)",
      placeholder: "Enter Municipality Name (EN)",
      searchable: true,
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

export default townhallsSchema;
