class CrudPageBuilder {
  constructor(schema, apiEndpoint, rootContainerId) {
    this.schema = schema;
    this.apiEndpoint = apiEndpoint;
    this.rootContainer = document.getElementById(rootContainerId); // Main container for everything

    // State and element references
    this.state = {
      additionalFormData: {},
      currentPage: 1,
      pageSize: 10,
      filterParams: {},
      updateEntityId: null,
    };
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
  async initialize() {
    this.createContainers(); // Create all necessary HTML containers
    await this.renderForm("create");
    // this.renderForm("update"); // Render Update form
    await this.renderFilterForm();
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
    // createFormContainer.innerHTML = `<div class="card-body"><h5 class="card-title">Create ${this.schema.name}</h5><form id="create-form"></form></div>`;
    this.rootContainer.appendChild(createFormContainer);
    this.elements.createFormContainer = createFormContainer;
    // this.elements.createForm =
    //   createFormContainer.querySelector("#create-form");

    // Create Update form container (hidden initially)
    const updateFormContainer = document.createElement("div");
    updateFormContainer.id = "form-update-container";
    updateFormContainer.classList.add("card", "mt-4");
    updateFormContainer.style.display = "none";
    // updateFormContainer.innerHTML = `<div class="card-body"><h5 class="card-title">Update ${this.schema.name}</h5><form id="update-form"></form></div>`;
    this.rootContainer.appendChild(updateFormContainer);
    this.elements.updateFormContainer = updateFormContainer;
    // this.elements.updateForm =
    //   updateFormContainer.querySelector("#update-form");

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
  async renderForm(type, data = {}) {
    const formContainer =
      type === "create"
        ? this.elements.createFormContainer
        : this.elements.updateFormContainer;
    formContainer.innerHTML = "";
    const cardBody = document.createElement("div");
    cardBody.className = "card-body";

    const cardTitle = document.createElement("h5");
    cardTitle.className = "card-title";
    cardTitle.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ${
      this.schema.name
    }`;

    const form = document.createElement("form");
    form.id = `${type}-form`;

    cardBody.appendChild(cardTitle);
    cardBody.appendChild(form);
    formContainer.appendChild(cardBody);
    this.elements[`${type}Form`] = form;

    for (const field in this.schema.properties) {
      const property = this.schema.properties[field];
      const formGroup = await this.createFormGroup(field, property);

      const input = formGroup.querySelector(`#${field}`);
      if (data[field] !== undefined) {
        if (input.type === "checkbox") {
          input.checked = data[field];
        } else {
          input.value = data[field];
        }
      }

      form.appendChild(formGroup);
    }

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.classList.add("btn", "btn-primary");
    submitButton.textContent = type === "create" ? "Submit" : "Update";
    form.appendChild(submitButton);

    form.addEventListener("submit", (event) =>
      this.handleFormSubmit(event, type)
    );
  }

  // Create form group for each field
  async createFormGroup(field, property) {
    
    const formGroup = document.createElement("div");
    formGroup.classList.add("mb-3");

    const label = document.createElement("label");
    label.classList.add("form-label");
    label.setAttribute("for", field);
    label.textContent = property.label || field;

    let input;

    if (property?.renderConfig?.type === "table_multi_select") {
      // Table Multi-Select Logic
      input = document.createElement("select");
      input.classList.add("form-select"); // Add margin for spacing
      input.id = field;
      // input.name = field;
      input.multiple = true;

      formGroup.appendChild(label);
      formGroup.appendChild(input);

      const self = this;
      $(document).ready(function () {
        $(`#${field}`).select2({
          placeholder: "Select permissions...",
          minimumInputLength: 3,
          language: {
            inputTooShort: function () {
              return "Please enter at least 3 characters to search"; // Custom message
            },
          },
          ajax: {
            url: property.renderConfig.fetchFrom,
            dataType: "json",
            delay: 250,
            data: function (params) {
              const searchTerm =
                property.renderConfig.selectSearchKey || "name";
              const filterParams = JSON.stringify({
                [searchTerm]: params.term,
              });
              return {
                filterParams: filterParams,
                pageSize: 10,
                page: params.page || 1,
              };
            },
            processResults: function (data, params) {
              params.page = params.page || 1;

              return {
                results: data.result.map(function (item) {
                  const displayText = property.renderConfig.selectDisplayKey
                    .map((key) => item[key].toUpperCase())
                    .join(" - ");
                  return { id: item.id, text: displayText };
                }),
                pagination: {
                  more: data.count > params.page * 10,
                },
              };
            },
            cache: true,
          },
          theme: "bootstrap-5",
        });
      })

      $(document).on("select2:select select2:unselect", `#${field}`, function (e) {
        const selectedValues = $(this).val();  // Get current selected values
        console.log("Current selected items:", selectedValues);  // Debug selected items
        self.state.additionalFormData[field] = selectedValues;
      });
    } else if (property?.renderConfig?.type === "select") {
      if (property?.renderConfig?.fetchFrom) {
        input = document.createElement("select");
        input.classList.add("form-control");
        input.id = field;
        input.name = field;
        const response = await fetch(property.renderConfig.fetchFrom);
        const data = await response.json();

        const emptyOption = new Option("Select an option", "");
        input.appendChild(emptyOption);
        data.forEach((option) => {
          const optionElement = new Option(
            option[property.renderConfig.displayKey],
            option.id
          );
          input.appendChild(optionElement);
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
    const form = event.target;
    const formData = new FormData(form);

    const data = Object.fromEntries(formData);

    // Add additional form data to the form data object
    for (const [key, value] of Object.entries(this.state.additionalFormData)) {
      console.log("Additional form data:", key, value);
      // console.log(JSON.stringify(value));
      data[key] = value;
    }

    // remove empty values
    for (const key in data) {
      if (!data[key]) delete data[key];
    }
    const url =
      type === "create"
        ? `${this.apiEndpoint}`
        : `${this.apiEndpoint}/${this.elements.updateEntityId}`;
    const method = type === "create" ? "POST" : "PUT";

    console.log("Data to be submitted:", data);
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
        this.createActionButton("Update", async () =>
          this.populateUpdateForm(record)
        )
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
      text === "Update" ? "btn-warning" : "btn-danger"
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
        await this.renderForm("update", data);
        this.elements.updateEntityId = data.id;

        // Show the update form container, hide the create form if visible
        this.elements.updateFormContainer.style.display = "block";
        this.elements.createFormContainer.style.display = "none";
      } else {
        this.elements.updateEntityId = null;
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
  async renderFilterForm() {
    const filterForm = this.elements.filterForm;
    filterForm.innerHTML = "";

    for (const [field, property] of Object.entries(
      this.schema.properties
    ).filter(([key, property]) => property.filterable)) {
      const filterGroup = await this.createFormGroup(field, property);
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

export { CrudPageBuilder };
