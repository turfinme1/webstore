import municipalitiesSchema from "../schemas/municipalitiesSchema.js";
import regionsSchema from "../schemas/regionsSchema.js";
import townhallsSchema from "../schemas/townhallsSchema.js";
import settlementsSchema from "../schemas/settlementsSchema.js";

const schemas = {
  "crud-regions": regionsSchema,
  "crud-municipalities": municipalitiesSchema,
  "crud-town-halls": townhallsSchema,
  "crud-settlements": settlementsSchema,
};

document.addEventListener("DOMContentLoaded", () => {
  const schema = getSchemaBasedOnUrl();

  const formContainer = document.getElementById("form-container");

  document.getElementById("create-btn").addEventListener("click", () => {
    formContainer.innerHTML = "";
    const createFormElement = createForm(schema, "create-form");
    formContainer.appendChild(createFormElement);

    const event = new Event("formCreated");
    document.dispatchEvent(event);
  });

  document.getElementById("search-btn").addEventListener("click", () => {
    formContainer.innerHTML = "";
    const searchFormElement = createSearchForm(schema, "search-form");
    formContainer.appendChild(searchFormElement);

    const event = new Event("searchFormCreated");
    document.dispatchEvent(event);
  });

  renderTable(schema);
});

function getSchemaBasedOnUrl() {
  const path = window.location.pathname.split("/").pop().replace(".html", "");
  return schemas[path] || null;
}

function attachValidationListeners(formId, schema) {
  const form = document.getElementById(formId);
  if (!form) return;

  const Ajv = window.Ajv;

  const ajv = new Ajv({ allErrors: true, strict: false });
  window.ajvErrors(ajv);
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
      url = `${url}/${entityId}`;
    }

    const response = await fetch(`/crud/${url}`, {
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
  const entityName = schema.name.replace("_", " ");
  formTitle.innerText = isUpdate
    ? `Update ${entityName}`
    : `Create ${entityName}`;
  form.appendChild(formTitle);

  const tableContainer = document.getElementById("table-container");
  tableContainer.innerHTML = ""; // Clear the table
  const paginationContainer = document.getElementById("pagination-container");
  paginationContainer.innerHTML = ""; // Clear the pagination
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

    let input;
    if (key.endsWith("_id")) {
      const inputButtonContainer = document.createElement("div");
      inputButtonContainer.className = "input-button-container";

      // Create a text input for search and a button to trigger the search
      input = document.createElement("input");
      input.type = "text";
      // input.id = isUpdate ? `${key}` : key;
      // input.name = key;
      input.placeholder = `Search for ${field.label}`;

      const searchButton = document.createElement("button");
      searchButton.type = "button";
      searchButton.innerText = "Search";
      searchButton.addEventListener("click", async () => {
        const searchValue = input.value;
        const resource = field.routeName; // Assuming the routeName is the resource to search
        const results = await fetchSearchResults(resource, searchValue); // Function to fetch search results

        // Clear previous options
        select.innerHTML = "";

        // Populate select with new options
        results.forEach((result) => {
          const option = document.createElement("option");
          option.value = result.id;
          option.innerText = result.name; // Assuming the search result has an `id` and `name` field
          select.appendChild(option);
        });

        // Show select dropdown after search results are populated
        select.style.display = "block";
      });

      const select = document.createElement("select");
      select.id = `${key}_select`;
      select.name = key;
      select.className = "form-select";

      // Initially hide the select dropdown until there are search results
      select.style.display = "none";

      inputButtonContainer.appendChild(input);
      inputButtonContainer.appendChild(searchButton);

      wrapper.appendChild(label);
      wrapper.appendChild(inputButtonContainer);
      wrapper.appendChild(select);
    } else {
      // Default text input for other fields
      input = document.createElement("input");
      input.type = "text";
      input.id = isUpdate ? `${key}` : key;
      input.name = key;
      input.placeholder = field.placeholder;

      wrapper.appendChild(label);
      wrapper.appendChild(input);
    }

    // Create an element for the field-specific error message
    const errorMessage = document.createElement("div");
    errorMessage.className = "field-error-message";
    errorMessage.id = `${input.id}-error`;

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

async function fetchSearchResults(key, query, pageSize = 100) {
  const response = await fetch(
    `/crud/${key}?searchParam=${encodeURIComponent(query)}&pageSize=${pageSize}`
  );
  if (response.ok) {
    const data = await response.json();
    return data.rows; // Assuming the response has a `results` array
  }
  return [];
}

async function fetchReferentialEntity(key, id) {
  const response = await fetch(`/crud/${key}/${id}`);
  if (response.ok) {
    const data = await response.json();
    return data; // Assuming the response is the entity object
  }
  return [];
}

function createSearchForm(schema, formId) {
  const form = document.createElement("form");
  form.id = formId;

  const formTitle = document.createElement("h2");
  const entityName = schema.name.replace("_", " ");
  formTitle.innerText = `Search ${entityName}`;
  form.appendChild(formTitle);

  // Create search inputs for each searchable property
  Object.entries(schema.displayProperties).forEach(([key, value]) => {
    if (value.searchable) {
      const inputContainer = document.createElement("div");
      inputContainer.className = "form-group";

      const label = document.createElement("label");
      label.innerText = value.label || key;
      label.htmlFor = `${formId}_${key}`;
      inputContainer.appendChild(label);

      const input = document.createElement("input");
      input.type = "text";
      input.id = `${formId}_${key}`;
      input.name = key;
      input.placeholder = value.placeholder || '';
      input.className = "form-control";
      inputContainer.appendChild(input);

      form.appendChild(inputContainer);
    }
  });

  // Create submit button
  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.innerText = "Search";
  submitButton.className = "btn btn-primary";
  form.appendChild(submitButton);

  // Handle form submission
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const searchParams = {};

    // Capture search inputs
    Object.entries(schema.displayProperties).forEach(([key, value]) => {
      if (value.searchable) {
        const input = document.getElementById(`${formId}_${key}`);
        if (input && input.value.trim()) {
          searchParams[key] = input.value.trim();
        }
      }
    });
    
    renderTable(schema, searchParams)
  });

  return form;
}

function createTable(
  schema,
  data,
  totalRowCount,
  searchParams,
  orderParams,
  page,
  pageSize,
) {
  const tableContainer = document.getElementById("table-container");
  tableContainer.innerHTML = "";

  const summaryBox = document.createElement("div");
  summaryBox.className = "summary-box";
  summaryBox.innerText = `Found ${totalRowCount} records.`;
  tableContainer.appendChild(summaryBox);

  const table = document.createElement("table");
  table.className = "data-table";

  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (const key in schema.displayProperties) {
    const th = document.createElement("th");
    const columnLabel = schema.displayProperties[key].label;

    // Determine the sort order for the next click
    const currentSortIndex = orderParams.findIndex(param => param[0] === key);
    const currentSort = currentSortIndex >= 0 ? orderParams[currentSortIndex][1] : null;
    let nextOrderType = currentSort === "ASC" ? "DESC" : "ASC";

    th.innerText = columnLabel;
    th.className = "sortable"; // Optional: add a class for styling sortable columns

    if (currentSort) {
      th.classList.add(currentSort.toLowerCase());
      const sortNumber = document.createElement("span");
      sortNumber.className = "sort-number";
      sortNumber.innerText = currentSortIndex + 1; // Display the order index
      th.appendChild(sortNumber);
    }

    // Add a click event listener to handle sorting
    // TODO: Implement sorting
    th.addEventListener("click", () => {
      if (currentSortIndex >= 0) {
        // If the column is already sorted, update its sort order
        orderParams[currentSortIndex][1] = nextOrderType;
        // Move this column to the start of the array
        const [currentSort] = orderParams.splice(currentSortIndex, 1);
        orderParams.unshift(currentSort);
      } else {
        // If the column is not sorted yet, add it to the start of orderParams
        orderParams.unshift([key, nextOrderType]);
      }
      // Render the table with the updated sort parameters
      renderTable(schema, searchParams, orderParams, page, pageSize);
      goToPage(schema, searchParams, orderParams, page, pageSize);
    });
    
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

    for (const key in schema.displayProperties) {
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
  tableContainer.appendChild(table);

  return table;
}

async function renderTable(
  schema,
  searchParams = {},
  orderParams = [],
  page = 1,
  pageSize = 10,
) {
  try {
    const queryParams = new URLSearchParams({
      searchParams : JSON.stringify(searchParams),
      orderParams : JSON.stringify(orderParams),
      page,
      pageSize,
    });

    console.log("Query Params:", queryParams);
    // Fetch data with pagination and search criteria
    const response = await fetch(`/crud/${schema.routeName}?${queryParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch the ${schema.name} data.`);
    }

    const data = await response.json();
    const { rows, totalRowCount } = data;

    const table = createTable(
      schema,
      rows,
      totalRowCount,
      searchParams,
      orderParams,
      page,
      pageSize
    );

    // Generate pagination controls
    const totalPages = Math.ceil(totalRowCount / pageSize);
    if (totalPages > 0) {
      createPaginationButtons(
        schema,
        searchParams,
        orderParams,
        pageSize,
        totalPages,
        page
      );
    } else {
      const paginationContainer = document.getElementById(
        "pagination-container"
      );
      paginationContainer.innerHTML = "";
    }
  } catch (error) {
    console.error(`Error fetching ${schema.name} data:`, error);
  }
}

function createPaginationButtons(
  schema,
  searchParams,
  orderParams,
  pageSize,
  totalPages,
  currentPage,
) {
  const container = document.getElementById("pagination-container");
  container.innerHTML = ""; // Clear previous pagination

  // Previous Button
  const prevButton = document.createElement("button");
  prevButton.innerText = "Previous";
  prevButton.disabled = currentPage <= 1; // Disable if on the first page
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      goToPage(
        schema,
        searchParams,
        orderParams,
        currentPage - 1,
        pageSize
      );
    }
  });
  container.appendChild(prevButton);

  // Current Page Display
  const currentPageDisplay = document.createElement("span");
  currentPageDisplay.innerText = `Page ${currentPage}`;
  // currentPageDisplay.style.margin = "0 10px";
  container.appendChild(currentPageDisplay);

  // Next Button
  const nextButton = document.createElement("button");
  nextButton.innerText = "Next";
  nextButton.disabled = currentPage >= totalPages; // Disable if on the last page
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      goToPage(
        schema,
        searchParams,
        orderParams,       
        currentPage + 1,
        pageSize
      );
    }
  });
  container.appendChild(nextButton);

  // "Go to Page" Input
  const goToPageWrapper = document.createElement("div");
  // goToPageWrapper.style.display = "inline-block";
  // goToPageWrapper.style.marginLeft = "20px";

  const goToPageLabel = document.createElement("label");
  goToPageLabel.innerText = "Go to Page: ";
  // goToPageLabel.style.marginRight = "5px";
  goToPageWrapper.appendChild(goToPageLabel);

  const goToPageInput = document.createElement("input");
  goToPageInput.type = "number";
  goToPageInput.value = currentPage;
  goToPageInput.min = 1;
  goToPageInput.max = totalPages;
  // goToPageInput.style.width = "50px";
  goToPageWrapper.appendChild(goToPageInput);

  const goToPageButton = document.createElement("button");
  goToPageButton.innerText = "Go";
  goToPageButton.addEventListener("click", () => {
    const targetPage = parseInt(goToPageInput.value);
    if (targetPage >= 1 && targetPage <= totalPages) {
      goToPage(
        schema,
        searchParams,
        orderParams,       
        targetPage,
        pageSize
      );
    }
  });
  goToPageWrapper.appendChild(goToPageButton);

  container.appendChild(goToPageWrapper);

  // Handle case where there are no pages (i.e., totalPages is 0)
  if (totalPages === 0) {
    prevButton.disabled = true;
    nextButton.disabled = true;
    goToPageInput.disabled = true;
  }
}

function goToPage(schema, searchParams, orderParams, page, pageSize) {
  renderTable(schema, searchParams, orderParams, page, pageSize);
}

async function handleEdit(schema, item) {
  console.log("Editing item:", item);
  try {
    // Fetch the latest data for the item from the server
    const response = await fetch(`/crud/${schema.routeName}/${item.id}`);
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

      const select = document.getElementById(`${key}_select`);
      if (select) {
        // Fetch options for the select field
        const relatedData = await fetchReferentialEntity(
          schema.properties[key].routeName,
          data[key]
        );
        select.innerHTML = "";
        const option = document.createElement("option");
        option.value = relatedData.id;
        option.innerText = relatedData.name;
        if (relatedData.id === data[key]) {
          option.selected = true;
        }
        select.appendChild(option);
        select.style.display = "block"; // Show the select element
      }
    }

    // Trigger the event for attaching validation listeners
    const event = new Event("formCreated");
    document.dispatchEvent(event);
  } catch (error) {
    alert(`An error occurred while fetching ${item.name}. Please try again.`);
  }
}

async function handleDelete(schema, item) {
  if (confirm(`Are you sure you want to delete region: ${item.name}?`)) {
    console.log("Deleting item:", item);
    // Send a DELETE request to the server to remove the item
    const response = await fetch(`/crud/${schema.routeName}/${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json();
      console.error("Error deleting item:", data);
      alert(`An error occurred while deleting ${item.name}. Please try again.`);
    } else {
      alert(`${item.name} deleted successfully.`);
      renderTable(schema);
    }
  }
}
