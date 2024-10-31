class CrudPageBuilder {
  constructor(schema, apiEndpoint, rootContainerId) {
    this.schema = schema;
    this.apiEndpoint = apiEndpoint;
    this.rootContainer = document.getElementById(rootContainerId); // Main container for everything

    // State and element references
    this.state = { currentPage: 1, pageSize: 10, filterParams: {} };
    this.elements = {
      filterContainer: null,
      filterForm: null,
      createFormContainer: null,
      createForm: null,
      updateFormContainer: null,
      updateForm: null,
      tableContainer: null,
      paginationContainer: null,
      paginationControllsContainer: null,
      resultCount: null,
      currentPageDisplay: null,
      showFilterButton: null,
      showCreateFormButton: null,
    };
  }

  // Initialize the CRUD page by creating containers and attaching event listeners
  initialize() {
    this.createContainers(); // Create all necessary HTML containers
    this.renderForm("create");
    // this.renderForm("update"); // Render Update form
    this.renderFilterForm();
    this.loadRecords(); // Load initial records with pagination
    this.attachEventListeners(); // Attach necessary event listeners
  }

  createContainers() {
    // Create title
    const title = document.createElement("h1");
    title.textContent = `${
      this.schema.name.charAt(0).toUpperCase() + this.schema.name.slice(1)
    } Management`;
    this.rootContainer.appendChild(title);

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add(
      "d-flex",
      "justify-content-between",
      "align-items-center",
      "mb-3"
    );
    this.rootContainer.appendChild(buttonContainer);

    const showFilterButton = document.createElement("button");
    showFilterButton.id = "show-filter-btn";
    showFilterButton.classList.add("btn", "btn-primary");
    showFilterButton.textContent = `FILTER`;
    buttonContainer.appendChild(showFilterButton);
    this.elements.showFilterButton = showFilterButton;

    const showCreateFormButton = document.createElement("button");
    showCreateFormButton.id = "show-form-btn";
    showCreateFormButton.classList.add("btn", "btn-success");
    showCreateFormButton.textContent = `CREATE`;
    buttonContainer.appendChild(showCreateFormButton);
    this.elements.showCreateFormButton = showCreateFormButton;

    // Create filter container
    const filterContainer = document.createElement("div");
    filterContainer.id = "filter-container";
    filterContainer.classList.add("card", "mt-4");
    filterContainer.style.display = "none";
    filterContainer.innerHTML = `<div class="card-body"><h5 class="card-title">Filter ${this.schema.name}</h5><form id="filter-form"></form></div>`;
    this.rootContainer.appendChild(filterContainer);
    this.elements.filterContainer = filterContainer;
    this.elements.filterForm = filterContainer.querySelector("#filter-form");

    // Create Create form container
    const createFormContainer = document.createElement("div");
    createFormContainer.id = "form-container";
    createFormContainer.classList.add("card", "mt-4");
    createFormContainer.style.display = "none";
    createFormContainer.innerHTML = `<div class="card-body"><h5 class="card-title">Create ${this.schema.name}</h5><form id="create-form"></form></div>`;
    this.rootContainer.appendChild(createFormContainer);
    this.elements.createFormContainer = createFormContainer;
    this.elements.createForm =
      createFormContainer.querySelector("#create-form");

    // Create Update form container (hidden initially)
    const updateFormContainer = document.createElement("div");
    updateFormContainer.id = "form-update-container";
    updateFormContainer.classList.add("card", "mt-4");
    updateFormContainer.style.display = "none";
    updateFormContainer.innerHTML = `<div class="card-body"><h5 class="card-title">Update ${this.schema.name}</h5><form id="update-form"></form></div>`;
    this.rootContainer.appendChild(updateFormContainer);
    this.elements.updateFormContainer = updateFormContainer;
    this.elements.updateForm =
      updateFormContainer.querySelector("#update-form");

    // Create table container
    const tableContainer = document.createElement("div");
    tableContainer.id = "table-container";
    tableContainer.classList.add("table-responsive", "mt-4");
    this.rootContainer.appendChild(tableContainer);
    this.elements.tableContainer = tableContainer;

    // Create pagination container
    const paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination-container";
    paginationContainer.classList.add(
      "d-flex",
      "justify-content-between",
      "align-items-center"
    );

    const currentPageDisplay = document.createElement("span");
    currentPageDisplay.id = "current-page-display";
    paginationContainer.appendChild(currentPageDisplay);

    const paginationControllsContainer = document.createElement("div");
    paginationControllsContainer.id = "pagination-container";
    paginationControllsContainer.classList.add("d-flex");
    paginationContainer.appendChild(paginationControllsContainer);

    const resultCount = document.createElement("span");
    resultCount.id = "result-count";
    paginationContainer.appendChild(resultCount);

    this.rootContainer.appendChild(paginationContainer);

    this.elements.paginationContainer = paginationContainer;
    this.elements.paginationControllsContainer = paginationControllsContainer;
    this.elements.resultCount = resultCount;
    this.elements.currentPageDisplay = currentPageDisplay;
  }

  // Render Create and Update Forms
  renderForm(type, data = {}) {
    const formContainer =
      type === "create" ? this.elements.createForm : this.elements.updateForm;
    formContainer.innerHTML = ""; // Clear any existing form

    // const formContainer = document.createElement("form");
    formContainer.id = `${type}-form`;
    formContainer.addEventListener("submit", (event) =>
      this.handleFormSubmit(event, type)
    );

    for (const field in this.schema.properties) {
      const property = this.schema.properties[field];
      const formGroup = this.createFormGroup(field, property);

      const input = formGroup.querySelector(`#${field}`);
      if (data[field] !== undefined) {
        if (input.type === "checkbox") {
          input.checked = data[field];
        } else if (input.tagName === "SELECT") {
          input.value = data[field];
        } 
        else {
          input.value = data[field];
        }
      }

      formContainer.appendChild(formGroup);
    }

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.classList.add("btn", "btn-primary");
    submitButton.textContent = type === "create" ? "Submit" : "Update";
    formContainer.appendChild(submitButton);

    // formContainer.appendChild(formContainer);
  }

  // Create form group for each field
  createFormGroup(field, property) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("mb-3");

    const label = document.createElement("label");
    label.classList.add("form-label");
    label.setAttribute("for", field);
    label.textContent = property.label || field;

    let input;

    if (property?.renderConfig?.type === "select") {
      if (property?.renderConfig?.fetchFrom) {
        input = document.createElement("select");
        input.classList.add("form-control");
        input.id = field;
        input.name = field;
        fetch(property.renderConfig.fetchFrom)
          .then((response) => response.json())
          .then((data) => {
            const emptyOption = new Option("Select an option", "");
            input.appendChild(emptyOption);
            data.forEach((option) => {
              const optionElement = new Option(
                option[property.renderConfig.displayKey],
                option.id
              );
              input.appendChild(optionElement);
            });
          });
      } else if (property?.renderConfig?.options) {
        input = document.createElement("select");
        input.classList.add("form-control");
        input.id = field;
        input.name = field;
        property.renderConfig.options.forEach((option) => {
          const optionElement = new Option(
            option.label || option,
            option.value || option
          );
          input.appendChild(optionElement);
        });
      }
    } else if (property.type === "boolean" || property.options) {
      // Check if the field should be a select dropdown (e.g., boolean)
      input = document.createElement("select");
      input.classList.add("form-control");
      input.id = field;
      input.name = field;

      if (property.type === "boolean") {
        // For boolean type, add options "Yes" and "No"
        const trueOption = new Option("Yes", "true");
        const falseOption = new Option("No", "false");
        input.appendChild(trueOption);
        input.appendChild(falseOption);
      } else if (property.options) {
        // If predefined options are specified in the schema, add them
        property.options.forEach((option) => {
          const optionElement = new Option(
            option.label || option,
            option.value || option
          );
          input.appendChild(optionElement);
        });
      }
    } else {
      // For other types, create an input element with appropriate type
      input = document.createElement("input");
      input.classList.add("form-control");
      input.id = field;
      input.name = field;
      input.placeholder = property.placeholder || "";
      input.type = this.getInputType(property.type); // Set the input type based on the schema
    }

    formGroup.appendChild(label);
    formGroup.appendChild(input);
    return formGroup;
  }

  getInputType(type) {
    switch (type) {
      case "string":
        return "text";
      case "integer":
        return "number";
      case "boolean":
        return "checkbox";
      case "date":
        return "date";
      default:
        return "text";
    }
  }

  // Handle form submission (Create or Update)
  async handleFormSubmit(event, type) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    const url =
      type === "create"
        ? `${this.apiEndpoint}`
        : `${this.apiEndpoint}/${data.id}`;
    const method = type === "create" ? "POST" : "PUT";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      alert(
        type === "create"
          ? "Record created successfully!"
          : "Record updated successfully!"
      );
      this.elements.createFormContainer.style.display = "none";
      this.elements.updateFormContainer.style.display = "none";
      this.loadRecords();
      event.target.reset();
    } else {
      const error = await response.json();
      const errorMessage =
        error.message || "An error occurred! Please try again.";
      alert(`Error: ${errorMessage}`);
    }
  }

  // Render table with pagination controls
  async loadRecords() {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(this.state.filterParams),
      page: this.state.currentPage,
      pageSize: this.state.pageSize,
    });

    const response = await fetch(`${this.apiEndpoint}/filtered?${queryParams}`);
    const { result, count } = await response.json();
    this.renderTable(result);
    this.renderPagination(count, this.state.currentPage);
  }

  renderTable(data) {
    this.elements.tableContainer.innerHTML = "";

    const table = document.createElement("table");
    table.classList.add("table", "table-bordered");

    // Render table headers
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    this.schema.table_display_columns.forEach((column) => {
      const th = document.createElement("th");
      th.textContent = column
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      headerRow.appendChild(th);
    });

    const actionTh = document.createElement("th");
    actionTh.textContent = "Actions";
    headerRow.appendChild(actionTh);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Render table rows
    const tbody = document.createElement("tbody");
    data.forEach((record) => {
      const row = document.createElement("tr");
      this.schema.table_display_columns.forEach((key) => {
        const td = document.createElement("td");
        td.textContent = record[key];
        row.appendChild(td);
      });

      const actionTd = document.createElement("td");
      actionTd.appendChild(
        this.createActionButton("Edit", () => this.populateUpdateForm(record))
      );
      actionTd.appendChild(
        this.createActionButton("Delete", () => this.deleteRecord(record.id))
      );
      row.appendChild(actionTd);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    this.elements.tableContainer.appendChild(table);
  }

  createActionButton(text, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add(
      "btn",
      "btn-sm",
      text === "Edit" ? "btn-warning" : "btn-danger"
    );
    button.addEventListener("click", onClick);
    return button;
  }

  async populateUpdateForm(record) {
    try {
      // Fetch the record by ID
      const response = await fetch(`${this.apiEndpoint}/${record.id}`);
      const data = await response.json();

      if (response.ok) {
        // Populate the form with data
        this.renderForm("update", data);

        // Show the update form container, hide the create form if visible
        this.elements.updateFormContainer.style.display = "block";
        this.elements.createFormContainer.style.display = "none";
      } else {
        alert(`Error fetching record: ${data.message}`);
      }
    } catch (error) {
      console.error("Failed to load record data for update:", error);
      alert("An error occurred while fetching the record.");
    }
  }

  async deleteRecord(id) {
    if (confirm("Are you sure you want to delete this record?")) {
      await fetch(`${this.apiEndpoint}/delete/${id}`, { method: "DELETE" });
      this.loadRecords();
    }
  }

  // Render pagination controls
  renderPagination(totalCount, currentPage) {
    const totalPages = Math.ceil(totalCount / this.state.pageSize);
    this.elements.paginationControllsContainer.innerHTML = "";
    this.elements.currentPageDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
    this.elements.resultCount.textContent = `Found ${totalCount} results`;

    if (totalCount == 0) {
      this.elements.currentPageDisplay.textContent = "";
      return;
    }

    this.elements.paginationControllsContainer.appendChild(
      this.createPaginationButton("Previous", currentPage > 1, () =>
        this.changePage(currentPage - 1)
      )
    );
    this.elements.paginationControllsContainer.appendChild(
      this.createPaginationButton("Next", currentPage < totalPages, () =>
        this.changePage(currentPage + 1)
      )
    );
  }

  createPaginationButton(text, enabled, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.disabled = !enabled;
    button.classList.add("btn", "btn-secondary", "me-2");
    if (enabled) button.addEventListener("click", onClick);
    return button;
  }

  changePage(newPage) {
    this.state.currentPage = newPage;
    this.loadRecords();
  }

  // Render filter form
  renderFilterForm() {
    const filterForm = this.elements.filterForm;
    filterForm.innerHTML = "";

    for (const [field, property] of Object.entries(
      this.schema.properties
    ).filter(([key, property]) => property.filterable)) {
      const filterGroup = this.createFormGroup(field, property);
      filterForm.appendChild(filterGroup);
    }

    const applyButton = document.createElement("button");
    applyButton.classList.add("btn", "btn-primary");
    applyButton.textContent = "Apply Filters";
    applyButton.type = "submit";
    filterForm.appendChild(applyButton);

    const cancelButton = document.createElement("button");
    cancelButton.classList.add("btn", "btn-secondary", "ms-2");
    cancelButton.textContent = "Cancel";
    cancelButton.type = "button";
    filterForm.appendChild(cancelButton);
    cancelButton.addEventListener("click", () => {
      this.elements.filterContainer.style.display = "none";
    });
  }

  attachEventListeners() {
    // Handle Create form submission
    const createForm = this.rootContainer.querySelector("#create-form");
    if (createForm) {
      createForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.handleFormSubmit(event, "create");
      });
    }

    // Handle Update form submission
    const updateForm = this.rootContainer.querySelector("#update-form");
    if (updateForm) {
      updateForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.handleFormSubmit(event, "update");
      });
    }

    // Handle filter form submission
    const filterForm = this.elements.filterForm;
    if (filterForm) {
      filterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(this.elements.filterForm);

        const entries = Array.from(formData.entries());

        for (const [key, value] of entries) {
          if (!value) formData.delete(key);
        }

        this.state.filterParams = Object.fromEntries(formData);
        this.loadRecords();
      });
    }

    this.elements.showCreateFormButton.addEventListener("click", () => {
      this.elements.filterContainer.style.display = "none";
      this.elements.createFormContainer.style.display = "block";
      this.elements.updateFormContainer.style.display = "none";
    });
    this.elements.showFilterButton.addEventListener("click", () => {
      this.elements.filterContainer.style.display = "block";
      this.elements.createFormContainer.style.display = "none";
      this.elements.updateFormContainer.style.display = "none";
    });

    // Add click event listeners for pagination buttons (Previous and Next)
    const paginationContainer = this.elements.paginationContainer;
    paginationContainer.addEventListener("click", (event) => {
      if (event.target.tagName === "BUTTON") {
        const page = parseInt(event.target.dataset.page);
        if (!isNaN(page)) {
          this.loadRecords(page);
        }
      }
    });
  }
}

// Initialize the CRUD page with schema and API endpoint
const userSchema = {
  "type": "object",
  "name": "admin-users",
  "table": "admin_users",
  "views": "admin_users_view",
  "queryValidationSchema": "userQueryParamsSchema",
  "properties": {
    "first_name": {
      "type": "string",
      "minLength": 3,
      "pattern": "^[a-zA-Z]+$",
      "label": "First Name",
      "placeholder": "Enter First Name",
      "filterable": true,
      "errorMessage": {
        "minLength": "Name must be at least 3 characters long.",
        "pattern": "Name can only contain letters and spaces."
      }
    },
    "last_name": {
      "type": "string",
      "minLength": 3,
      "pattern": "^[a-zA-Z]+$",
      "label": "Last Name",
      "placeholder": "Enter Last Name",
      "filterable": true,
      "errorMessage": {
        "minLength": "Name must be at least 3 characters long.",
        "pattern": "Name can only contain letters and spaces."
      }
    },
    "email": {
      "type": "string",
      "minLength": 6,
      "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      "label": "Email",
      "placeholder": "Enter Email",
      "filterable": true,
      "errorMessage": {
        "minLength": "Email must be at least 6 characters long.",
        "pattern": "Email must be a valid email address."
      }
    },
    "password_hash": {
      "type": "string",
      "minLength": 6,
      "label": "Password",
      "placeholder": "Enter password",
      "errorMessage": {
        "minLength": "Password must be at least 6 characters long."
      }
    },
    "iso_country_code_id": {
      "type": "integer",
      "label": "Country Code",
      "placeholder": "Enter Country Code",
      "fetchFrom": "/crud/iso-country-codes",
      "renderConfig": {
        "type": "select",
        "fetchFrom": "/crud/iso-country-codes",
        "displayKey": "phone_code"
      },
      "errorMessage": {
        "type": "Invalid country code ID."
      }
    },
    "phone": {
      "type": "string",
      "minLength": 7,
      "pattern": "^[0-9]+$",
      "label": "Phone Number",
      "placeholder": "Enter Phone Number",
      "errorMessage": {
        "minLength": "Phone number must be at least 7 digits long.",
        "pattern": "Phone number can only contain digits."
      }
    },
    "gender_id": {
      "type": ["integer", "null"],
      "label": "Gender",
      "placeholder": "Select Gender",
      "renderConfig": {
        "type": "select",
        "options": [
          {
            "value": 3,
            "label": "Not Specified"
          },
          {
            "value": 1,
            "label": "Male"
          },
          {
            "value": 2,
            "label": "Female"
          }
        ]
      },
      "errorMessage": {
        "type": "Invalid value for gender."
      }
    },
    "country_id": {
      "type": ["integer", "null"],
      "label": "Country",
      "placeholder": "Enter Country",
      "filterable": true,
      "renderConfig": {
        "type": "select",
        "fetchFrom": "/crud/iso-country-codes",
        "displayKey": "country_name"
      },
      "errorMessage": {
        "type": "Invalid country code ID."
      }
    },
    "address": {
      "type": ["string", "null"],
      "label": "Address",
      "placeholder": "Enter Address",
      "errorMessage": {
        "type": "Address must be text."
      }
    },
    "is_email_verified": {
      "type": "boolean",
      "label": "Email Verified",
      "placeholder": "Email Verified",
      "errorMessage": {
        "type": "Invalid value for email verification."
      }
    }
  },
  "table_display_columns": [
    "id",
    "first_name",
    "last_name",
    "email",
    "phone_code",
    "phone",
    "country_name",
    "gender",
    "address",
    "is_email_verified"
  ],
  "relationships": {
    "sessions": {
      "table": "sessions",
      "foreign_key": "user_id",
      "nested_relationships": {
        "captchas": {
          "table": "captchas",
          "foreign_key": "session_id"
        },
        "failed_attempts": {
          "table": "failed_attempts",
          "foreign_key": "session_id"
        }
      }
    },
    "email_verifications": {
      "table": "email_verifications",
      "foreign_key": "user_id"
    },
    "comments": {
      "table": "comments",
      "foreign_key": "user_id"
    },
    "ratings": {
      "table": "ratings",
      "foreign_key": "user_id"
    }
  },
  "required": [
    "first_name",
    "last_name",
    "password",
    "email",
    "phone",
    "iso_country_code_id"
  ],
  "additionalProperties": false,
  "errorMessage": {
    "required": {
      "password": "Password is required.",
      "first_name": "First Name is required.",
      "last_name": "Last Name is required.",
      "email": "Email is required.",
      "phone": "Phone number is required.",
      "iso_country_code_id": "Country code is required.",
      "captcha_answer": "Captcha is required."
    },
    "additionalProperties": "No additional properties are allowed."
  }
}
;
const apiEndpoint = "/crud/admin-users";
const crudPageBuilder = new CrudPageBuilder(
  userSchema,
  apiEndpoint,
  "crud-container"
);
crudPageBuilder.initialize();
