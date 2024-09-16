const userSchema = {
  type: "object",
  name: "users",
  routeName: "users",
  views: "users_view",
  properties: {
    name: {
        type: "string",
        minLength: 3,
        pattern: "^[a-zA-Z ]+$",
        label: "Name",
        placeholder: "Enter Name",
        errorMessage: {
          minLength: "Name must be at least 3 characters long.",
          pattern: "Name can only contain letters and spaces.",
        },
      },
    password: {
      type: "string",
      minLength: 6,
      label: "Password",
      placeholder: "Enter password",
      errorMessage: {
        minLength: "Password must be at least 8 characters long.",
      },
    },
    email: {
      type: "string",
      minLength: 6,
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      label: "Email",
      placeholder: "Enter Email",
      errorMessage: {
        minLength: "Email must be at least 6 characters long.",
        pattern: "Email must be a valid email address.",
      },
    },
    phone: {
      type: "string",
      minLength: 7,
      pattern: "^[0-9]+$",
      label: "Phone Number",
      placeholder: "Enter Phone Number",
      errorMessage: {
        minLength: "Phone number must be at least 7 digits long.",
        pattern: "Phone number can only contain digits.",
      },
    },
    iso_country_code_id: {
      type: "integer",
      label: "Country",
      fetchFrom: "/crud/countryCodes", 
      placeholder: "Select Country Code",
      errorMessage: {
        type: "Invalid country code.",
      },
    },
    gender_id: {
      type: ["integer", "null"], 
      label: "Gender",
      enumValues: [
          { "label": "Not Specified", "value": null },
          { "label": "Male", "value": 1 },
          { "label": "Female", "value": 2 }
        ],
      placeholder: "Select Gender",
      errorMessage: {
        type: "Invalid value for gender.",
      },
    },
    address: {
      type: ["string", "null"],
      label: "Address",
      placeholder: "Enter Address",
      errorMessage: {
        type: "Address must be text.",
      },
    },
  },
  required: ["name", "password", "email", "phone", "iso_country_code_id"],
  additionalProperties: false,
  errorMessage: {
    required: {
      password: "Password is required.",
      name: "Name is required.",
      email: "Email is required.",
      phone: "Phone number is required.",
      iso_country_code_id: "Country code is required.",
    },
    additionalProperties: "No additional properties are allowed.",
  },
  loginSchema:{
    type: "object",
    properties: {
      email: {
        type: "string",
        label: "Email",
        placeholder: "Enter Email",
      },
      password: {
        type: "string",
        label: "Password",
        placeholder: "Enter password",
      },
    },
    required: ["email", "password"],
    additionalProperties: false,
    errorMessage: {
      required: {
        email: "Email is required.",
        password: "Password is required.",
      },
      additionalProperties: "No additional properties are allowed.",
    },
  }
};

module.exports = userSchema;
