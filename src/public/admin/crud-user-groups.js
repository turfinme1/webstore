import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling, showErrorMessage, showMessage, getUrlParams, updateUrlParams } from "./page-utility.js";
import { ReportBuilder } from "./report-builder.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  searchParams: {},
  filterParams: {},
  orderParams: [],
  countries: [],
  userToUpdateId: null,
  userStatus: null,
};

// DOM elements
const elements = {
  mainContainer: document.getElementById("main-container"),
  formContainer: document.getElementById("form-container"),
  formUpdateContainer: document.getElementById("form-update-container"),
  userListContainer: document.getElementById("user-list"),
  paginationContainer: document.getElementById("pagination-container"),
  currentPageDisplay: document.getElementById("current-page-display"),
  resultCountDisplay: document.getElementById("result-count"),
  createFormWrapper: document.getElementById("create-form"),
  userUpdateFormWrapper: document.getElementById("user-update-form"),
  cancelButton: document.getElementById("cancel-btn"),
  cancelUpdateButton: document.getElementById("cancel-update-btn"),
  searchInput: document.getElementById("search-input"),
  showFormButton: document.getElementById("show-form-btn"),
  countryCodeSelect: document.getElementById("iso_country_code_id"),
  countrySelect: document.getElementById("country_id"),
  countryCodeUpdateSelect: document.getElementById(
    "iso_country_code_id_update"
  ),
  countryUpdateSelect: document.getElementById("country_id_update"),
  showFilterButton: document.getElementById("show-filter-btn"),
  cancelFilterButton: document.getElementById("cancel-filter-btn"),
  filterContainer: document.getElementById("filter-container"),
  filterForm: document.getElementById("filter-form"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  state.userStatus = userStatus;
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);
  const urlParams = getUrlParams();
  state.currentPage = urlParams.page || 1;
  state.pageSize = urlParams.pageSize || 10;
  state.filterParams = urlParams.filterParams || {};
  state.orderParams = urlParams.orderParams || [];

  if (!hasPermission(userStatus, "read", "users")) {
    elements.mainContainer.innerHTML = "<h1>User Management</h1>";
    return;
  }
  if (!hasPermission(userStatus, "create", "users")) {
    elements.showFormButton.style.display = "none";
  }
  await renderCreateAndUpdateForms();
  await attachEventListeners();
  await loadUsers(state.currentPage);
});

// Attach event listeners
function attachEventListeners() {
  elements.cancelButton.addEventListener("click", hideForm);
  elements.showFormButton.addEventListener("click", showForm);
  elements.cancelUpdateButton.addEventListener("click", hideUpdateForm);
  elements.showFilterButton.addEventListener("click", showFilterForm);
  elements.cancelFilterButton.addEventListener("click", hideFilterForm);

  elements.createForm.addEventListener("submit", handleCreateUser);
  elements.userUpdateForm.addEventListener("submit", handleUpdateUser);
  elements.filterForm.addEventListener("submit", handleFilterUsers);
  document.querySelectorAll('th.sortable').forEach(header => {
    header.addEventListener('click', async (e) => {
        await handleSortChange(e);
    });
  });

  $(document).ready(function() {
    $('select[multiple]').multiselect({
      enableClickableOptGroups: true,
      enableCollapsibleOptGroups: true,
      buttonWidth: '100%',
      maxHeight: 400,
      buttonClass: 'form-select text-start',
      nonSelectedText: 'Select options',
      templates: {
        button: '<button type="button" class="multiselect dropdown-toggle form-select" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>'
      }
    });
  });
}

// Show and hide functions
function hideForm() {
  elements.formContainer.style.display = "none";
}

function hideUpdateForm() {
  elements.formUpdateContainer.style.display = "none";
}

function showForm() {
  elements.formContainer.style.display = "block";
  elements.formUpdateContainer.style.display = "none";
  elements.filterContainer.style.display = "none";
}

function showUpdateForm() {
  elements.formUpdateContainer.style.display = "block";
  elements.formContainer.style.display = "none";
  elements.filterContainer.style.display = "none";
}

function showFilterForm() {
  elements.filterContainer.style.display = "block";
  elements.formContainer.style.display = "none";
  elements.formUpdateContainer.style.display = "none";
}

function hideFilterForm() {
  elements.filterContainer.style.display = "none";
}


// Fetch and render users
async function loadUsers(page) {
  try {
    const orderDirection = state.orderParams.map(item => [item.key, item.direction]);
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      pageSize: state.pageSize.toString(),
      orderParams: JSON.stringify(orderDirection),
      page: page.toString(),
    });
    updateUrlParams(state);
    const response = await fetchWithErrorHandling(
      `/crud/user-groups/filtered?${queryParams.toString()}`
    );
    if(!response.ok) {
      showErrorMessage(response.error);
      return;
    }
    const { result, count } = await response.data;
    renderUserList(result);
    updateSortIndicators();
    updatePagination(count, page);
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

function updateSortIndicators() {
  document.querySelectorAll('th[data-sort-key]').forEach(header => {
      // Ensure we store the original header text once
    if (!header.dataset.originalText) {
      header.dataset.originalText = header.textContent.trim();
    }
    const originalText = header.dataset.originalText;
    const key = header.dataset.sortKey;
    const sortEntry = state.orderParams.find(c => c.key === key);
    const sortEntryPosition = state.orderParams.findIndex(c => c.key === key);
    
    // Rebuild the header text using the original label
    header.innerHTML = originalText;
    
    if (sortEntry) {
      // Append a sort indicator with the position and arrow
      header.innerHTML += ` ${sortEntryPosition + 1}${sortEntry.direction === 'ASC' ? '↑' : '↓'}`;
    }
  });
}

async function handleSortChange(e) {
  const key = e.currentTarget.dataset.sortKey;
  const currentCriteria = [...state.orderParams];
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

  state.orderParams = currentCriteria;

  await loadUsers(state.currentPage);
}

// Render user list
function renderUserList(users) {
  console.log(users);
  elements.userListContainer.innerHTML = ""; // Clear previous list
  users.forEach((user) => {
    const userRow = document.createElement("tr");

    // Create cells for user attributes
    userRow.appendChild(createTableCell(user.id));
    userRow.appendChild(createTableCell(user.name));
    userRow.appendChild(createTableCell(formatDate(user.created_at)));
    userRow.appendChild(createTableCell(formatDate(user.updated_at)));
    userRow.appendChild(createTableCell(formatFilters(user.filters)));
    userRow.appendChild(createTableCell(user.users_count, "right"));

    // Actions (Update/Delete)
    const actionCell = createTableCell("");
    if (hasPermission(state.userStatus, "update", "users")) {
      actionCell.appendChild(
        createActionButton("Edit", "btn-warning", () =>
          displayUpdateForm(user.id)
        )
      );
    }

    if (hasPermission(state.userStatus, "delete", "users")) {
      actionCell.appendChild(
        createActionButton("Delete", "btn-danger", () =>
          handleDeleteUser(user.id)
        )
      );
    }
    userRow.appendChild(actionCell);

    elements.userListContainer.appendChild(userRow);
  });
}

// Create table cell
function createTableCell(text, align = "left") {
  const cell = document.createElement("td");
  cell.style.textAlign = align;
  cell.textContent = text;
  return cell;
}

// Create action button
function createActionButton(text, btnClass, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.classList.add("btn", btnClass, "me-2");
  button.addEventListener("click", onClick);
  return button;
}

// Update pagination
function updatePagination(totalUsers, page) {
  const totalPages = Math.ceil(totalUsers / state.pageSize);
  elements.paginationContainer.innerHTML = "";
  elements.currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;
  elements.resultCountDisplay.textContent = `Found ${totalUsers} results`;

  if (totalUsers == 0) {
    elements.currentPageDisplay.innerHTML = "";
    return;
  }

  elements.paginationContainer.appendChild(
    createPaginationButton("Previous", page > 1, () => {
      state.currentPage = page - 1;
      loadUsers(state.currentPage);
    })
  );
  elements.paginationContainer.appendChild(
    createPaginationButton("Next", page < totalPages, () => {
      state.currentPage = page + 1;
      loadUsers(state.currentPage);
    })
  );
}

// Create pagination button
function createPaginationButton(text, enabled, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.classList.add("btn", "btn-secondary", "me-2");
  button.disabled = !enabled;
  if (enabled) button.addEventListener("click", onClick);
  return button;
}

// Handle user creation
async function handleCreateUser(event) {
  event.preventDefault();
  try {
    const formData = new FormData(elements.createForm);
    const data = Object.fromEntries(formData);
    const name = data.name_filter_value;
    const filters = {};
    const payload = { name, filters };

    for (const [key, value] of formData.entries()) {
      if (key.endsWith('_filter_value') && document.getElementById(key)?.multiple) {
          if (!filters[key]) {
              filters[key] = formData.getAll(key);
          }
      } else {
          filters[key] = typeof value === 'string' ? value.trim() : value;
      }    
    }
    elements.createForm.querySelector('button[type="submit"]').disabled = true;
    elements.createForm.querySelector('#spinner').style.display = "inline-block";

    if(!name && name.trim() === "") {
      showErrorMessage("Group Name is required");
      elements.createForm.querySelector('button[type="submit"]').disabled = false;
      return;
    }

    const filterKeys = Object.keys(filters);
    for (const key of filterKeys) {
      if(key.includes("min") && filters[key] && filters[key.replace("min", "max")]) {
        let min;
        let max;
        if(key.includes("created") && filters[key]) {
          min = new Date(filters[key]);
          max = new Date(filters[key.replace("min", "max")]);
        } else {
          min = parseInt(filters[key]);
          max = parseInt(filters[key.replace("min", "max")]);
        }
        
        if(min > max) {
          showErrorMessage(`Min should be less than Max for ${key.replace("minimum_filter_value", "").split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`);
          elements.createForm.querySelector('button[type="submit"]').disabled = false;
          return;
        }
      }
    }

    const response = await fetchWithErrorHandling("/crud/user-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      showMessage("User group created successfully!");
      elements.createForm.reset();
      hideForm();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      loadUsers(state.currentPage);
    } else {
      showErrorMessage(`Failed to create user group: ${response.error}`);
    }
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    elements.createForm.querySelector('button[type="submit"]').disabled = false;
    elements.createForm.querySelector('#spinner').style.display = "none";
  }
}

async function handleUpdateUser(event) {
  event.preventDefault();
  const formData = new FormData(elements.userUpdateForm);
  const data = Object.fromEntries(formData);
  const name = data.name_filter_value;
  const filters = {};
  const payload = { name, filters };
  
  for (const [key, value] of formData.entries()) {
    if (key.endsWith('_filter_value') && document.getElementById(key)?.multiple) {
        if (!filters[key]) {
            filters[key] = formData.getAll(key);
        }
    } else {
        filters[key] = typeof value === 'string' ? value.trim() : value;
    }    
  }

  try {
    elements.userUpdateForm.querySelector('button[type="submit"]').disabled = true;
    elements.userUpdateForm.querySelector('#spinner').style.display = "inline-block";

    const response = await fetchWithErrorHandling(`/crud/user-groups/${state.userToUpdateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      showMessage("User group updated successfully!");
      elements.userUpdateForm.reset();
      state.filterParams = {};
      state.currentPage = 1;
      hideUpdateForm();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      loadUsers(state.currentPage);
    } else {
      showErrorMessage(`Failed to update user group: ${response.error}`);
    }
  } catch (error) {
    console.error("Error updating user:", error);
  } finally {
    elements.userUpdateForm.querySelector('button[type="submit"]').disabled = false;
    elements.userUpdateForm.querySelector('#spinner').style.display = "none";
  }
}

async function displayUpdateForm(userId) {
  try {
    const userResponse = await fetchWithErrorHandling(`/crud/user-groups/${userId}`);
    if (!userResponse.ok) {
      showErrorMessage(userResponse.error);
      return;
    }
    const user = await userResponse.data;
    showUpdateForm();
    populateUpdateForm(user);
    state.userToUpdateId = userId;
  } catch (error) {
    console.error("Error loading user for update:", error);
  }
}

// Populate update form
function populateUpdateForm(user) {
    const filters = user.filters;
    for (const key in filters) {
      const element = elements.userUpdateForm[key];
      if (element) {
          if (element._flatpickr) {
            element._flatpickr.setDate(filters[key]);
          } else if (element.multiple) {
            const values = Array.isArray(filters[key]) ? filters[key] : [filters[key]];
            
            $(element).find('option:selected').prop('selected', false);
            
            values.forEach(val => {
                $(element).find(`option[value="${val}"]`).prop('selected', true);
            });
            
            $(element).multiselect('refresh');
        } else {
          element.value = filters[key];
        }
      }
    }
  // elements.userUpdateForm["first_name"].value = user.first_name;
  // elements.userUpdateForm["last_name"].value = user.last_name;
  // elements.userUpdateForm["email"].value = user.email;
  // elements.userUpdateForm["iso_country_code_id"].value =
  //   user.iso_country_code_id;
  // elements.userUpdateForm["phone"].value = user.phone;
  // if(user.birth_date){
  //   elements.userUpdateForm["birth_date"].value = dayjs(user.birth_date).format("YYYY-MM-DD");
  // }
  // elements.userUpdateForm["country_id"].value = user.country_id;
  // elements.userUpdateForm["gender_id"].value = user.gender_id;
  // elements.userUpdateForm["address"].value = user.address;
  // elements.userUpdateForm["is_email_verified"].value = user.is_email_verified;
}

// Handle user deletion
async function handleDeleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    const response = await fetchWithErrorHandling(`/crud/user-groups/${userId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      showMessage("User group deleted successfully!");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      loadUsers(state.currentPage);
    } else {
      showErrorMessage(`Failed to delete user: ${response.error}`);
    }
  } catch (error) {
    console.error("Error deleting user:", error);
  }
}

async function handleFilterUsers(event) {
  event.preventDefault();
  const formData = new FormData(elements.filterForm);
  if (formData.get("country_id") === "") {
    formData.delete("country_id");
  }
  const filterParams = Object.fromEntries(formData);

  const usersCountMin = parseInt(formData.get("users_count_min"));
  const usersCountMax = parseInt(formData.get("users_count_max"));
  if((usersCountMin && usersCountMax) && (usersCountMin > usersCountMax)) {
    alert("Min should be less than Max");
    return;
  }
  if (usersCountMin || usersCountMax) {
    filterParams["users_count"] = {};
    if(usersCountMin) {
      filterParams["users_count"].min = usersCountMin;
    }
    if(usersCountMax) {
      filterParams["users_count"].max = usersCountMax;
    }
  }
  delete filterParams["users_count_min"];
  delete filterParams["users_count_max"];
  state.filterParams = filterParams;

  state.orderParams = [];
  // if(elements.orderBySelect.value){
  //   state.orderParams = [elements.orderBySelect.value.split(" ")];
  // } else {
  //   state.orderParams = [];
  // }

  // Reload users with the new filters
  state.currentPage = 1;
  loadUsers(state.currentPage);
}

async function renderCreateAndUpdateForms() {
    const reportConfigResponse = await fetch("/api/reports/report-users", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadataRequest: true }),
    });
    if (!reportConfigResponse.ok) {
        elements.mainContainer.innerHTML = "<h1>Failed to load user groups</h1>";
        return;
    }
  
    const reportConfig = await reportConfigResponse.json();
    reportConfig.reportUIConfig.filters = reportConfig.reportFilters;
    reportConfig.reportUIConfig.filters.unshift({
        key: "name",
        type: "text",
        label: "Group Name",
    });
    const reportUI = new ReportBuilder(reportConfig.reportUIConfig);
    elements.createFormWrapper.innerHTML = "";
    elements.userUpdateFormWrapper.innerHTML = "";
    await reportUI.buildFilterForm(elements.createFormWrapper);
    await reportUI.buildFilterForm(elements.userUpdateFormWrapper);

    const elementsToHide = document.querySelectorAll('[id*="grouping_select_value"]');
    elementsToHide.forEach(element => {
        element.style.display = "none";
    });

    const forms = document.querySelectorAll('#report-form');
    elements.createForm = forms[0];
    elements.userUpdateForm = forms[1];

    elements.createForm.querySelector('button[type="submit"]').textContent = "Create";
    elements.userUpdateForm.querySelector('button[type="submit"]').textContent = "Update";

    elements.createForm.querySelector('button[type="submit"]').parentNode.innerHTML += `<div id="spinner" class="spinner-border text-primary" role="status" style="display: none;">
      <span class="visually-hidden">Loading...</span>
    </div>`;
    elements.userUpdateForm.querySelector('button[type="submit"]').parentNode.innerHTML += `<div id="spinner" class="spinner-border text-primary" role="status" style="display: none;">
      <span class="visually-hidden">Loading...</span>
    </div>`;

    document.querySelectorAll('.flatpickr-input').forEach(input => {
        if (input._flatpickr) {
          input._flatpickr.clear();
        } else {
          input.value = '';
        }
    });
}

function formatDate (value) {
    if (!value || value === "All") {
        return '---';
      }
      const date = new Date(value);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

function formatFilters(filters) {
    function formatLabel(key) {
      key = key.replace(/(_filter_value)|(_grouping_select_value)/g, '');
      if(key === 'phone_code') key = 'phone_code_id';
      if(key === 'country_name') key = 'country_id';
      return key.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
    }
  
    let output = '';
    Object.entries(filters).forEach(([key, value]) => {
      if(key.includes("created") && value) value = formatDate(filters[key]);
      if (value !== "") {
        output += `${formatLabel(key)}: ${value},`;
      }
    });
    return output.slice(0, -1);
}