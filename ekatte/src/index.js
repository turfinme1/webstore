import Ajv from "ajv";
import addFormats from "ajv-formats";
import ajvErrors from "ajv-errors";
import { municipalitySchema } from "./schemas/municipalityEntitySchema.js";
import { regionSchema } from "./schemas/regionEntitySchema.js";
import { townHallSchema } from "./schemas/townHallEntitySchema.js";
import { settlementSchema } from "./schemas/settlementEntitySchema.js";

// Initialize AJV
const ajv = new Ajv.default({ allErrors: true });
addFormats(ajv);
ajvErrors(ajv);

const schemas = {
  "crud-regions": regionSchema,
  "crud-municipalities": municipalitySchema,
  "crud-town-halls": townHallSchema,
  "crud-settlements": settlementSchema,
};

function getSchemaBasedOnUrl() {
  const path = window.location.pathname.split("/").pop().replace(".html", "");
  return schemas[path] || null;
}

function attachValidationListeners(formId, schema) {
  const form = document.getElementById(formId);
  if (!form) return;

  const ajv = new Ajv({ allErrors: true, strict: false });
  ajvErrors(ajv);
  const validate = ajv.compile(schema);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const { id, ...dataWithoutId } = data;
    // Clear previous error messages
    document
      .querySelectorAll(".field-error-message")
      .forEach((el) => (el.innerText = ""));
    document.querySelector(".generic-error-message").innerText = "";

    const valid = validate(dataWithoutId);

    if (!valid) {
      // Display errors
      validate.errors.forEach((error) => {
        const field = error.instancePath.slice(1); // remove the leading slash
        const errorMessageEl = document.getElementById(`${field}-error`);

        if (errorMessageEl) {
          errorMessageEl.innerText = error.message;
        }
      });
      console.log("Form data is invalid", validate.errors);
      document.querySelector(".generic-error-message").innerText =
        "Please fix the errors above.";
    } else {
      console.log("Form data is valid", data);

      const schemaBasedUrl = `/${schema.routeName}`;
      const method = formId.includes("update") ? "PUT" : "POST";
      const entityId = formId.includes("update") ? id : null;
      // Submit form data to the server
      handleFormSubmission(schemaBasedUrl, method, dataWithoutId, formId, entityId);
      // Handle valid form submission (e.g., send to server)
    }
  });
}

document.addEventListener("formCreated", () => {
  const schema = getSchemaBasedOnUrl();

  if (schema) {
    // Attach validation for the create form
    attachValidationListeners("create-form", schema);

    // Attach validation for the update form if it exists
    attachValidationListeners("update-form", schema);
  } else {
    console.error("No schema found for this page.");
  }
});

document.addEventListener("searchFormCreated", () => {
  const schema = getSchemaBasedOnUrl();

  if (schema) {
    // Attach validation for the search form
    attachValidationListeners("search-form", schema);
  } else {
    console.error("No schema found for this page.");
  }
});

async function handleFormSubmission(url, method, data, formId, entityId) {
  const form = document.getElementById(formId);
  const genericErrorMessage = form.querySelector(".generic-error-message");

  try {
    if (entityId) {
      url = `${url}?id=${entityId}`;
    }

    const response = await fetch(`${url}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {

      genericErrorMessage.innerText =
        responseData.errors || "An error occurred during submission.";
    } else {
      console.log("Form submission successful:", responseData);
      // Handle successful form submission (e.g., navigate to another page, reset form, etc.)
      location.reload();
    }
  } catch (error) {
    console.error("Submission error:", error);
    genericErrorMessage.innerText = "An unexpected error occurred.";
  }
}
