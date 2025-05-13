import { hasPermission, fetchWithErrorHandling, showErrorMessage, showMessage } from "./page-utility.js";

class CrudPageBuilder {
  constructor(schema, apiEndpoint, rootContainerId, userStatus, querySchema) {
    this.schema = schema;
    this.apiEndpoint = apiEndpoint;
    this.rootContainer = document.getElementById(rootContainerId); // Main container for everything
    this.userStatus = userStatus;
    this.querySchema = querySchema;

    // State and element references
    this.state = {
      additionalFormData: {},
      currentPage: 1,
      pageSize: 10,
      filterParams: {},
      orderParams: [],
      sortCriteria: [],
      updateEntityId: null,
      collectValuesCallbacks: {
        create: [],
        update: [],
      },
      formHookCallbacks: {
        create: [],
        update: [],
      },
      fetchedSelectOptions: {},
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
    await this.loadRecords(); // Load initial records with pagination
    await this.attachEventListeners(); // Attach necessary event listeners
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

    const filterDiv = document.createElement("div");

    const showFilterButton = document.createElement("button");
    showFilterButton.id = "show-filter-btn";
    showFilterButton.classList.add("btn", "btn-primary");
    showFilterButton.textContent = `FILTER`;
    this.elements.showFilterButton = showFilterButton;
    if (hasPermission(this.userStatus, "read", this.schema.name)) {
      filterDiv.appendChild(showFilterButton);
    }
    
    // orderSelect.addEventListener("change", (event) => {
    //   this.state.filterParams.orderBy = event.target.value;
    //   this.loadRecords();
    // });

    buttonContainer.appendChild(filterDiv);

    const showCreateFormButton = document.createElement("button");
    showCreateFormButton.id = "show-form-btn";
    showCreateFormButton.classList.add("btn", "btn-success");
    showCreateFormButton.textContent = `CREATE`;
    this.elements.showCreateFormButton = showCreateFormButton;
    if (hasPermission(this.userStatus, "create", this.schema.name)) {
      buttonContainer.appendChild(showCreateFormButton);
    }

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
    this.rootContainer.appendChild(createFormContainer);
    this.elements.createFormContainer = createFormContainer;

    // Create Update form container (hidden initially)
    const updateFormContainer = document.createElement("div");
    updateFormContainer.id = "form-update-container";
    updateFormContainer.classList.add("card", "mt-4");
    updateFormContainer.style.display = "none";
    this.rootContainer.appendChild(updateFormContainer);
    this.elements.updateFormContainer = updateFormContainer;

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
      if (property?.hideInCreate && type === "create") continue;

      const formGroup = await this.createFormGroup(field, property, data, type);

      const input = formGroup.querySelector(`#${field}`);
      if (data[field] !== undefined) {
        if (input.type === "checkbox") {
          input.checked = data[field];
        } if(input.type === "datetime-local") {
          // input.value = dayjs(data[field]).format('YYYY-MM-DD');
          input.value = dayjs(data[field]).format('YYYY-MM-DDTHH:mm:ss');
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

    const formHookCallbacks = this.state.formHookCallbacks[type];
    for (const callback of formHookCallbacks) {
      await callback(form, type);
    }

    form.addEventListener("submit", (event) =>
      this.handleFormSubmit(event, type, this.state.collectValuesCallbacks)
    );
  }

  // Create form group for each field
  async createFormGroup(field, property, data, formType) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("mb-3");
    const label = document.createElement("label");
    label.classList.add("form-label");
    label.setAttribute("for", field);
    label.textContent = property.label || field;

    formGroup.appendChild(label);
    let input;

    if (
      property?.renderConfig?.type === "table_multi_select" &&
      Object.keys(data).length > 0
    ) {
      this.renderPermissionsTable(data, formGroup, label);
    } else if (property?.renderConfig?.type === "select") {
      if (property?.renderConfig?.fetchFrom) {
        input = document.createElement("select");
        input.classList.add("form-control");
        input.id = field;
        input.name = field;
        const response = await fetch(property.renderConfig.fetchFrom);
        const data = await response.json();
        this.state.fetchedSelectOptions[field] = data;
        console.log(this.state.fetchedSelectOptions);

        const emptyOption = new Option("Select an option", "");
        input.appendChild(emptyOption);
        data.forEach((option) => {
          const optionElement = new Option(
            option[property.renderConfig.displayKey],
            option.id
          );
          input.appendChild(optionElement);
        });

        if(property.required) {
          input.required = true;
        }
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

        if(property.required) {
          input.required = true;
        }
      }
    } else if (property?.renderConfig?.type === "multiselect") {
      const multiSelectContainer = document.createElement("div");
      multiSelectContainer.classList.add("dropdown");

      // Button to display selected items
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("btn", "btn-secondary", "dropdown-toggle");
      button.textContent = "Select options";

      // Dropdown container with Bootstrap classes
      const dropdown = document.createElement("div");
      dropdown.classList.add("dropdown-menu", "p-3");
      dropdown.style.maxHeight = "200px";
      dropdown.style.overflowY = "auto";

      // Fetch options dynamically if needed
      const options = property.renderConfig.options || [];
      if (property.renderConfig.fetchFrom) {
        const response = await fetch(property.renderConfig.fetchFrom);
        const fetchedData = await response.json();
        options.push(
          ...fetchedData.map((item) => ({
            label: item[property.renderConfig.displayKey],
            value: item.id,
          }))
        );
      }
      console.log("DATA", data);
      // Populate dropdown with checkboxes for each option
      options.forEach((option) => {
        const optionLabel = document.createElement("label");
        optionLabel.classList.add("dropdown-item", "form-check-label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("form-check-input", "me-2");
        checkbox.value = option.value;
        checkbox.checked = (data.roles || []).some(role => role.id == option.value);

        optionLabel.appendChild(checkbox);
        optionLabel.appendChild(document.createTextNode(option.label));
        dropdown.appendChild(optionLabel);
      });

      // Toggle dropdown visibility on button click
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      });

      // Prevent dropdown from closing when clicking inside
      dropdown.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (event) => {
        if (!multiSelectContainer.contains(event.target)) {
          dropdown.style.display = "none";
        }
      });

      // Update button text based on selected options
      const updateButtonText = () => {
        const selectedOptions = Array.from(
          dropdown.querySelectorAll("input:checked")
        )
          .map((checkbox) => checkbox.parentNode.textContent.trim())
          .join(", ");
        button.textContent = selectedOptions || "Select options";
      };

      // Add change event listener to each checkbox to update selection
      dropdown.addEventListener("change", updateButtonText);
      updateButtonText(); // Initial update

      // Append elements to container
      multiSelectContainer.appendChild(button);
      multiSelectContainer.appendChild(dropdown);
      formGroup.appendChild(multiSelectContainer);

      // Collect selected values for form submission
      this.state.collectValuesCallbacks[formType].push(() => ({
        [field]: Array.from(dropdown.querySelectorAll("input:checked")).map(
          (checkbox) => checkbox.value
        ),
      }));
    } else if (property?.renderConfig?.type === "date") {
      input = document.createElement("input");
      input.classList.add("form-control");
      input.id = field;
      input.name = field;
      input.type = "datetime-local";
      input.step = "1";

      if(!formType){
        // when the form is not create or update => filter form default value
        // input.value = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        input.value = dayjs().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ss');
      }

      if (property?.required?.[formType]) {
        input.required = true;
        label.innerHTML = `${label.textContent} <span style="color:red;">*</span>`;
      }

      // if (formType && property?.renderConfig?.setHoursToEndOfDay) {
      //   /// giga custom because there are 3 fields and the callback cant get the right one
      //   this.state.collectValuesCallbacks[formType].push(() => {
      //     const elements = document.querySelectorAll(`[id="${field}"]`);
      //     let input;
      //     if(formType === "create") {
      //       input = elements[1];
      //     } else {
      //       input = elements[2];
      //     }
      //     const date = new Date(input.value);
      //     date.setHours(23, 59, 59);
      //     return { [field]: date.toISOString() };
      //   });
      // }
      
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
      
      if(property?.renderConfig?.minimum) {
        input.min = property.renderConfig.minimum;
      }
      if(property?.renderConfig?.maximum) {
        input.max = property.renderConfig.maximum;
      }
      if(property?.renderConfig?.step) {
        input.step = property.renderConfig.step;
      }

      if (property.minLength) {
        input.minLength = property.minLength;
      }
      if (property.pattern) {
        input.pattern = property.pattern;
      }
      if (property?.required?.[formType]) {
        input.required = true;
        label.innerHTML = `${label.textContent} <span style="color:red;">*</span>`;
      }
    }

    if(property?.renderConfig?.conditionalTemplateDisplay === true) {
      input.addEventListener("change", (event) => this.handleTemplateChange(event));
      this.state.formHookCallbacks.create.push((form, type) => {
        const event = new Event("change");
        input.dispatchEvent(event);
      });
    }

    if (property?.renderConfig?.in_past === true) {
      if(formType) {
        this.state.collectValuesCallbacks[formType].push(() => {
          const date = new Date(input.value);
          const today = new Date();
          if (date < today) {
            showErrorMessage("Date must be in the future");
            throw new Error("Date must be in the future");
          }

          return;
        });
      }

    }

    if (input) {
      formGroup.appendChild(input);
    }
    return formGroup;
  }

  renderPermissionsTable(data, container, label) {
    const permissions = data.permissions;
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered";
    table.id = "permissionsContainer";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = [
      "Interface Name",
      "View",
      "Create",
      "Read",
      "Update",
      "Delete",
    ];
    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    permissions.forEach((permission) => {
      const row = document.createElement("tr");

      const interfaceNameCell = document.createElement("td");
      interfaceNameCell.textContent = permission.interface_name;
      row.appendChild(interfaceNameCell);

      ["view", "create", "read", "update", "delete"].forEach((action) => {
        const cell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = permission[action];
        checkbox.id = `${permission.interface_id}-${action}`;
        cell.appendChild(checkbox);
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(label);
    container.appendChild(table);

    const roleIdInput = document.createElement("input");
    roleIdInput.type = "hidden";
    roleIdInput.id = "roleIdInput";
    roleIdInput.value = data.id;
    container.appendChild(roleIdInput);

    this.state.collectValuesCallbacks.update.push(() => {
      const permissions = [];
      document
        .querySelectorAll('#permissionsContainer input[type="checkbox"]')
        .forEach((checkbox) => {
          const [interfaceId, action] = checkbox.id.split("-");
          permissions.push({
            interface_id: parseInt(interfaceId),
            action: action,
            allowed: checkbox.checked,
          });
        });
      return { id: data.id, permissions: permissions };
    });
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
      case "number":
        return "number";
      default:
        return "text";
    }
  }

  // Handle form submission (Create or Update)
  async handleFormSubmit(event, type, collectValuesCallbacks) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const data = Object.fromEntries(formData);

    for (const callback of collectValuesCallbacks[type]) {
      const additionalData = callback();

      if(additionalData) {
        for (const [key, value] of Object.entries(additionalData)) {
          data[key] = value;
        }
      }
    }

    // Add additional form data to the form data object
    for (const [key, value] of Object.entries(this.state.additionalFormData)) {
      console.log("Additional form data:", key, value);
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

    if(this.schema.dryRun === true) {
      const dryRunresponse = await fetchWithErrorHandling(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...data, dry_run: true}),
      });

      if (dryRunresponse.ok) {
        const confirmResult = confirm(dryRunresponse.data.message);
        if (!confirmResult) {
          return;
        }
      } else {
        showErrorMessage(dryRunresponse.error);
        return;
      }
    }

    console.log("Data to be submitted:", data);
    const response = await fetchWithErrorHandling(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      showMessage(type === "create" ? "Record created successfully!" : "Record updated successfully!");
      this.elements.createFormContainer.style.display = "none";
      this.elements.updateFormContainer.style.display = "none";
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.loadRecords();
      event.target.reset();
    } else {
      showErrorMessage(response.error);
    }
  }

  // Render table with pagination controls
  async loadRecords() {
    if (
      !hasPermission(this.userStatus, "read", this.schema.name) ||
      !hasPermission(this.userStatus, "view", this.schema.name)
    ) {
      return;
    }
    const orderDirection = this.state.sortCriteria.map(item => [item.key, item.direction]);
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(this.state.filterParams),
      orderParams: JSON.stringify(orderDirection),
      page: this.state.currentPage,
      pageSize: this.state.pageSize,
    });

    const response = await fetchWithErrorHandling(`${this.apiEndpoint}/filtered?${queryParams}`);
    if(!response.ok) {
      showErrorMessage(response.error);
      return;
    }
    const { result, count } = await response.data;

    this.renderTable(result);
    this.updateSortIndicators();
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
      th.classList.add("sortable");
      th.style.cursor = "pointer";
      th.dataset.sortKey = column;
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
        const property = this.schema.properties[key];
        if (property?.type === "number") {
          td.style.textAlign = "right";
        } else {
          td.style.textAlign = "left";
        }

        if (property?.renderConfig?.type === "date") {
          td.textContent = new Date(record[key]).toLocaleDateString();
          td.textContent = new Date(record[key]).toLocaleString();

          if (!record[key] || record[key] === "All") {
            return '---';
          }
          const date = new Date(record[key]);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          td.textContent = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        } else if (Array.isArray(record[key])) {
          td.textContent = record[key].map((item) => item.name).join(", ");
        } else if (property?.renderConfig?.currency) {
          td.textContent = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(record[key]);
        }
        else {
          td.textContent = record[key];
        }

        row.appendChild(td);
      });

      const actionTd = document.createElement("td");
      if (hasPermission(this.userStatus, "update", this.schema.name) && this.schema?.crud?.update !== false) {
        actionTd.appendChild(
          this.createActionButton("Edit", async () =>
            this.populateUpdateForm(record)
          )
        );
      }
      if (hasPermission(this.userStatus, "delete", this.schema.name) && this.schema?.crud?.delete !== false) {
        actionTd.appendChild(
          this.createActionButton("Delete", () => this.deleteRecord(record.id))
        );
      }
      row.appendChild(actionTd);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    this.elements.tableContainer.appendChild(table);

    document.querySelectorAll('th.sortable').forEach(header => {
      header.addEventListener('click', async (e) => {
          await this.handleSortChange(e);
      });
    });
  }

  updateSortIndicators() {
    document.querySelectorAll('th[data-sort-key]').forEach(header => {
        const key = header.dataset.sortKey;
        const sortEntry = this.state.sortCriteria.find(c => c.key === key);
        const sortEntryPosition = this.state.sortCriteria.findIndex(c => c.key === key);
        header.innerHTML = header.innerHTML.replace(/\d+/s, '');
        header.innerHTML = header.innerHTML.replace(/ ↑| ↓/g, '');
        if (sortEntry) header.innerHTML += sortEntry.direction === 'ASC' ? ` ${sortEntryPosition+1}↑` : `${sortEntryPosition+1}↓`;
    });
  }

  async handleSortChange(e) {
    const key = e.currentTarget.dataset.sortKey;
    const currentCriteria = [...this.state.sortCriteria];
    const existingIndex = currentCriteria.findIndex(c => c.key === key);

    let newDirection;
    if (existingIndex === -1) {
        newDirection = 'ASC';
    } else {
        const currentDirection = currentCriteria[existingIndex].direction;
        newDirection = currentDirection === 'ASC' ? 'DESC' : 'none';
    }

    if (existingIndex !== -1) currentCriteria.splice(existingIndex, 1);
    if (newDirection !== 'none') currentCriteria.unshift({ key, direction: newDirection });

    this.state.sortCriteria = currentCriteria;

    await this.loadRecords();
}

  createActionButton(text, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add(
      "btn",
      "btn-sm",
      "me-2",
      text === "Edit" ? "btn-warning" : "btn-danger"
    );
    button.addEventListener("click", onClick);
    return button;
  }

  async populateUpdateForm(record) {
    try {
      // Fetch the record by ID
      const response = await fetchWithErrorHandling(`${this.apiEndpoint}/${record.id}`);
      
      if (response.ok) {
        const data = await response.data;
        // Populate the form with data
        await this.renderForm("update", data);
        this.elements.updateEntityId = data.id;

        // Show the update form container, hide the create form if visible
        this.elements.updateFormContainer.style.display = "block";
        this.elements.createFormContainer.style.display = "none";
      } else {
        this.elements.updateEntityId = null;
        showErrorMessage(`${response.error}`);
      }
    } catch (error) {
      showErrorMessage("An error occurred while fetching the record.");
    }
  }

  async deleteRecord(id) {
    try {
      if (confirm("Are you sure you want to delete this record?")) {
        const result = await fetchWithErrorHandling(`${this.apiEndpoint}/${id}`, {
          method: "DELETE",
        });
        if (result.ok) {
          showMessage("Record deleted successfully!");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await this.loadRecords();
        } else {
          showErrorMessage(`Error deleting record: ${result.error}`);
        }
      }
    } catch (error) {
      showErrorMessage("An error occurred while deleting the record.");
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

    flatpickr('.form-control[type="datetime-local"]', {
      enableTime: true,
      enableSeconds: true,
      altInput: true,
      altFormat: "d-m-Y H:i:S",
      dateFormat: "Z",
      time_24hr: true,
      formatDate: (date, format) => {
        if (format === "Z") {
            const tzOffset = date.getTimezoneOffset();
            const tzSign = tzOffset <= 0 ? '+' : '-';
            
            const tzHours = Math.abs(Math.floor(tzOffset / 60));
            const tzMinutes = Math.abs(tzOffset % 60);
            
            const tzString = `${tzSign}${String(tzHours).padStart(2, '0')}:${String(tzMinutes).padStart(2, '0')}`;
            
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}${tzString}`;
        }
        return flatpickr.formatDate(date, format);
    },
      onReady: function(selectedDates, dateStr, instance) {
          var customContainer = document.createElement("div");
          customContainer.className = "custom-buttons-container";
          customContainer.style.marginTop = "10px";
          
          function addButton(label, callback) {
              var btn = document.createElement("button");
              btn.type = "button";
              btn.textContent = label;
              btn.style.marginRight = "5px";
              btn.style.padding = "5px 10px";
              btn.addEventListener("click", callback);
              customContainer.appendChild(btn);
          }
          
          addButton("Clear", function() {
              instance.clear();
          });

          addButton("Last Day", function() {
              var now = new Date();
              now.setDate(now.getDate() - 1);
              instance.setDate(now);
          });
          
          addButton("Last Week", function() {
              var now = new Date();
              now.setDate(now.getDate() - 7);
              instance.setDate(now);
          });

          addButton("Last Month", function() {
              var now = new Date();
              now.setMonth(now.getMonth() - 1);
              instance.setDate(now);
          });

          addButton("Last Year", function() {
              var now = new Date();
              now.setFullYear(now.getFullYear() - 1);
              instance.setDate(now);
          });
          
          instance.calendarContainer.appendChild(customContainer);
      }
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

  handleTemplateChange(event) {
    const templateType = event.target.value;
    const userIdsInput = document.querySelector("#user_ids");
    const templateIdInput = document.querySelector("#template_id");

    const filteredTemplates = this.state.fetchedSelectOptions["template_id"].filter(
      (template) => template.type === templateType
    );
    templateIdInput.innerHTML = "";
    for (const template of filteredTemplates) {
      const optionElement = new Option(
        template.name,
        template.id 
      );
      templateIdInput.appendChild(optionElement);
    }
    
    if (templateType === "Push-Notification-Broadcast") {
      userIdsInput.disabled = true;
      userIdsInput.required = false;
      userIdsInput.value = "";
    } else {
      userIdsInput.disabled = false;
      userIdsInput.required = this.schema.properties.user_ids.required.create || 
                            this.schema.properties.user_ids.required.update;
    }
  }
}

export { CrudPageBuilder };
