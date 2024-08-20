import Ajv from "ajv";
import addFormats from "ajv-formats";
import ajvErrors from "ajv-errors";
import { municipalitySchema } from "./schemas/municipalityEntitySchema.js";
import { regionSchema } from "./schemas/regionEntitySchema.js";
import { townHallSchema } from "./schemas/townHallEntitySchema.js";
import { settlementSchema } from "./schemas/settlementEntitySchema.js";

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
      handleFormSubmission(
        schemaBasedUrl,
        method,
        dataWithoutId,
        formId,
        entityId
      );
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
    // attachValidationListeners("search-form", schema);
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

function createForm(schema, formId, isUpdate = false) {
  const form = document.createElement("form");
  form.id = formId;

  const formTitle = document.createElement("h2");
  formTitle.innerText = isUpdate
    ? `Update ${schema.name}`
    : `Create ${schema.name}`;
  form.appendChild(formTitle);

  const tableContainer = document.getElementById("table-container");
  tableContainer.innerHTML = ""; // Clear the table
  const hiddenIdField = document.createElement("input");
  hiddenIdField.type = "hidden";
  hiddenIdField.id = "id";
  hiddenIdField.name = "id"; // Ensure the name matches what your backend expects
  form.appendChild(hiddenIdField);

  // Iterate over schema properties
  for (const key in schema.properties) {
    const field = schema.properties[key];

    // Create a wrapper div for each input and its error message
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = isUpdate ? `${key}` : key;
    label.innerText = field.label;

    const input = document.createElement("input");
    input.type = "text";
    input.id = isUpdate ? `${key}` : key;
    input.name = key;
    input.placeholder = field.placeholder;

    // Create an element for the field-specific error message
    const errorMessage = document.createElement("div");
    errorMessage.className = "field-error-message";
    errorMessage.id = `${input.id}-error`;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(errorMessage);

    form.appendChild(wrapper);
  }

  // Create a generic error message container
  const genericErrorMessage = document.createElement("div");
  genericErrorMessage.className = "generic-error-message";
  genericErrorMessage.id = `${formId}-generic-error`;
  form.appendChild(genericErrorMessage);

  const submitButton = document.createElement("input");
  submitButton.type = "submit";
  submitButton.value = isUpdate ? "Update" : "Add";
  form.appendChild(submitButton);

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", () => {
    // Clear the form container or handle cancel action
    const formContainer = document.getElementById("form-container");
    formContainer.innerHTML = ""; // Clear the form
    renderTable(schema); // Re-render the table
  });
  form.appendChild(cancelButton);

  return form;
}

function createSearchForm(schema, formId) {
  const form = document.createElement("form");
  form.id = formId;

  const formTitle = document.createElement("h2");
  formTitle.innerText = `Search ${schema.name}`;
  form.appendChild(formTitle);

  // Create search input field
  const searchInputWrapper = document.createElement("div");
  searchInputWrapper.className = "form-group";

  const searchInputLabel = document.createElement("label");
  searchInputLabel.htmlFor = "searchParam";
  searchInputLabel.innerText = "Search Term";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.id = "searchParam";
  searchInput.name = "searchParam";
  searchInput.placeholder = "Enter search term";

  searchInputWrapper.appendChild(searchInputLabel);
  searchInputWrapper.appendChild(searchInput);
  form.appendChild(searchInputWrapper);

  // Create search column select dropdown
  const searchSelectWrapper = document.createElement("div");
  searchSelectWrapper.className = "form-group";

  const searchSelectLabel = document.createElement("label");
  searchSelectLabel.htmlFor = "searchColumn";
  searchSelectLabel.innerText = "Search by ";

  const searchSelect = document.createElement("select");
  searchSelect.id = "searchColumn";
  searchSelect.name = "searchColumn";

  // Add option for searching all columns
  const optionAll = document.createElement("option");
  optionAll.value = "all";
  optionAll.innerText = "All Fields";
  searchSelect.appendChild(optionAll);

  // Add options for each searchable field
  for (const key in schema.properties) {
    if (schema.properties[key].searchable) {
      const option = document.createElement("option");
      option.value = key;
      option.innerText = schema.properties[key].label || key;
      searchSelect.appendChild(option);
    }
  }

  searchSelectWrapper.appendChild(searchSelectLabel);
  searchSelectWrapper.appendChild(searchSelect);
  form.appendChild(searchSelectWrapper);

  const genericErrorMessage = document.createElement("div");
  genericErrorMessage.className = "generic-error-message";
  genericErrorMessage.id = `${formId}-generic-error`;
  form.appendChild(genericErrorMessage);

    // Add submit button
  const submitButton = document.createElement("input");
  submitButton.type = "submit";
  submitButton.value = "Search";
  form.appendChild(submitButton);

  form.addEventListener("submit",async (event) => {
    event.preventDefault();
    await handleSearchFormSubmission(schema, formId);
  });

  return form;
}

function createTable(schema, data) {
  const table = document.createElement("table");
  table.className = "data-table";

  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (const key in schema.properties) {
    const th = document.createElement("th");
    th.innerText = schema.properties[key].label;
    headerRow.appendChild(th);
  }

  // Add Edit and Delete column headers
  const thEdit = document.createElement("th");
  thEdit.innerText = "Edit";
  headerRow.appendChild(thEdit);

  const thDelete = document.createElement("th");
  thDelete.innerText = "Delete";
  headerRow.appendChild(thDelete);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement("tbody");

  data.forEach((item) => {
    const row = document.createElement("tr");

    for (const key in schema.properties) {
      const td = document.createElement("td");
      td.innerText = item[key] || ""; // Handle missing data
      row.appendChild(td);
    }

    // Create Edit button
    const tdEdit = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.innerText = "Edit";
    editButton.className = "edit-button";
    editButton.addEventListener("click", async () => handleEdit(schema, item));
    tdEdit.appendChild(editButton);
    row.appendChild(tdEdit);

    // Create Delete button
    const tdDelete = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete";
    deleteButton.className = "delete-button";
    deleteButton.addEventListener("click", async () =>
      handleDelete(schema, item)
    );
    tdDelete.appendChild(deleteButton);
    row.appendChild(tdDelete);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  return table;
}

async function renderTable(schema, tableData) {
  const tableContainer = document.getElementById("table-container");
  let data;
  
  try {
    if (tableData) {
      data = tableData;
    }
    else {
      const response = await fetch(`/${schema.routeName}`);
      data = await response.json();
    }

    const table = createTable(schema, data);
    tableContainer.innerHTML = "";
    tableContainer.appendChild(table);
  } catch (error) {
    console.error(`Error fetching ${schema.name} data:`, error);
  }
}

async function handleEdit(schema, item) {
  console.log("Editing item:", item);
  try {
    // Fetch the latest data for the item from the server
    const response = await fetch(`/${schema.routeName}?id=${item.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch the ${schema.name} data.`);
    }

    const data = await response.json();

    // Assuming data is an object representing the region
    console.log("Editing item with fetched data:", data);

    // Populate the form with the fetched data
    const formContainer = document.getElementById("form-container");
    formContainer.innerHTML = ""; // Clear the container

    const updateFormElement = createForm(schema, "update-form", true);
    formContainer.appendChild(updateFormElement);

    // Populate form fields with the fetched data
    for (const key in data) {
      const input = document.getElementById(`${key}`);
      if (input) {
        input.value = data[key];
      }
    }

    // Trigger the event for attaching validation listeners
    const event = new Event("formCreated");
    document.dispatchEvent(event);
  } catch (error) {
    console.error(`Error fetching ${item.name} data:`, error);
    alert(
      `An error occurred while fetching the ${schema.name}. Please try again.`
    );
  }
}

async function handleDelete(schema, item) {
  if (confirm(`Are you sure you want to delete region: ${item.name}?`)) {
    console.log("Deleting item:", item);
    // Send a DELETE request to the server to remove the item
    const response = await fetch(`/${schema.routeName}?id=${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      console.error(`Failed to delete the ${schema.name}.`);
      alert(
        `An error occurred while deleting ${schema.name}. Please try again.`
      );
    } else {
      alert(`${item.name} deleted successfully.`);
      renderTable(schema);
    }
  }
}

async function handleSearchFormSubmission(schema, formId) {
  const form = document.getElementById(formId);
  const searchParam = form.querySelector("#searchParam").value;
  const searchColumn = form.querySelector("#searchColumn").value;

  const queryParams = new URLSearchParams({
    searchParam,
    searchColumn,
    orderColumn: "id",
    orderType: "ASC",  
    page: 1,
    pageSize: 100,     
  });

  const url = `/${schema.routeName}?${queryParams.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to search the ${schema.name} data.`);
    }
    const data = await response.json();

    renderTable(schema, data);

  } catch (error) {
    
  }
}