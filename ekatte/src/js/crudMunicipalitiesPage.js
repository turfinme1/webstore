import { municipalitySchema } from "../schemas/municipalityEntitySchema.js";

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
    renderTable(); // Re-render the table
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

  // Iterate over schema properties that are marked as searchable
  for (const key in schema.properties) {
    const field = schema.properties[key];

    if (field.searchable) {
      const wrapper = document.createElement("div");
      wrapper.className = "form-group";

      const label = document.createElement("label");
      label.htmlFor = key;
      label.innerText = `Search by ${field.label}`;

      const input = document.createElement("input");
      input.type = "text";
      input.id = key;
      input.name = key;
      input.placeholder = `Enter ${field.label.toLowerCase()}`;

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      form.appendChild(wrapper);
    }
  }

  const submitButton = document.createElement("input");
  submitButton.type = "submit";
  submitButton.value = "Search";
  form.appendChild(submitButton);

  const event = new Event("searchFormCreated");
  document.dispatchEvent(event);
  return form;
}

// Call these functions on page load
document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.getElementById("form-container");

  document.getElementById("create-btn").addEventListener("click", () => {
    formContainer.innerHTML = ""; // Clear the container
    const createFormElement = createForm(municipalitySchema, "create-form");
    formContainer.appendChild(createFormElement);

    // Add event listener for form submission
    // createFormElement.addEventListener('submit', handleFormSubmission);
    const event = new Event("formCreated");
    document.dispatchEvent(event);
  });

  document.getElementById("search-btn").addEventListener("click", () => {
    formContainer.innerHTML = ""; // Clear the container
    const searchFormElement = createSearchForm(municipalitySchema, "search-form");
    formContainer.appendChild(searchFormElement);

    // Add event listener for form submission
    // searchFormElement.addEventListener('submit', handleSearchSubmission);
    const event = new Event("searchFormCreated");
    document.dispatchEvent(event);
  });
});

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
    editButton.addEventListener("click", async () => handleEdit(item));
    tdEdit.appendChild(editButton);
    row.appendChild(tdEdit);

    // Create Delete button
    const tdDelete = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete";
    deleteButton.className = "delete-button";
    deleteButton.addEventListener("click", async () => handleDelete(item));
    tdDelete.appendChild(deleteButton);
    row.appendChild(tdDelete);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  return table;
}

async function renderTable() {
  const schema = getSchemaBasedOnUrl();
  const tableContainer = document.getElementById("table-container");

  const response = await fetch(`/${schema.routeName}`);
  const data = await response.json();

  if (schema) {
    const table = createTable(schema, data);
    tableContainer.innerHTML = ""; // Clear previous content
    tableContainer.appendChild(table);
  } else {
    console.error("No schema found for this page.");
  }
}

// Edit and Delete handlers
async function handleEdit(item) {
  console.log("Editing item:", item);
  try {
    // Fetch the latest data for the item from the server
    const response = await fetch(`/${municipalitySchema.routeName}?id=${item.id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch the region data.");
    }

    const data = await response.json();

    // Assuming data is an object representing the region
    console.log("Editing item with fetched data:", data);

    // Populate the form with the fetched data
    const formContainer = document.getElementById("form-container");
    formContainer.innerHTML = ""; // Clear the container

    const updateFormElement = createForm(municipalitySchema, "update-form", true);
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
    console.error("Error fetching region data:", error);
    alert("An error occurred while fetching the data. Please try again.");
  }
}

async function handleDelete(item) {
  if (confirm(`Are you sure you want to delete region: ${item.name}?`)) {
    console.log("Deleting item:", item);
    // Send a DELETE request to the server to remove the item
    const response = await fetch(`/${municipalitySchema.routeName}?id=${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      console.error("Failed to delete the region.");
      alert("An error occurred while deleting the region. Please try again.");
    } else {
      alert("Region deleted successfully.");
      renderTable();
    }
  }
}

// Call renderTable on page load
document.addEventListener("DOMContentLoaded", () => {
  renderTable();
});
