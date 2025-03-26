import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling, showToastMessage, getUrlParams, updateUrlParams } from "./page-utility.js";

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
  userForm: document.getElementById("user-form"),
  userUpdateForm: document.getElementById("user-update-form"),
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
  countryFilterSelect: document.getElementById("country_id_filter"),
  filterForm: document.getElementById("filter-form"),
  orderBySelect: document.getElementById("order_by"),
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
  attachEventListeners();
  loadUsers(state.currentPage);
  loadCountryCodes();
});

// Attach event listeners
function attachEventListeners() {
  elements.cancelButton.addEventListener("click", hideForm);
  elements.showFormButton.addEventListener("click", showForm);
  elements.cancelUpdateButton.addEventListener("click", hideUpdateForm);
  elements.showFilterButton.addEventListener("click", showFilterForm);
  elements.cancelFilterButton.addEventListener("click", hideFilterForm);

  elements.userForm.addEventListener("submit", handleCreateUser);
  elements.userUpdateForm.addEventListener("submit", handleUpdateUser);
  elements.filterForm.addEventListener("submit", handleFilterUsers);
  elements.orderBySelect.addEventListener("change", handleFilterUsers);
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

// Fetch countries
async function loadCountryCodes() {
  try {
    const response = await fetch("/crud/iso-country-codes");
    if (!response.ok) throw new Error("Failed to fetch country codes");
    state.countries = await response.json();

    const allCountriesOption = document.createElement("option");
    allCountriesOption.value = "";
    allCountriesOption.innerText = "All Countries";
    elements.countryFilterSelect.appendChild(allCountriesOption);

    state.countries.forEach((country) => {
      const phoneOption = document.createElement("option");
      phoneOption.value = country.id;
      phoneOption.innerText = `${country.country_name} (${country.phone_code})`;
      elements.countryCodeSelect.appendChild(phoneOption);
      elements.countryCodeUpdateSelect.appendChild(phoneOption.cloneNode(true));

      const countryOption = document.createElement("option");
      countryOption.value = country.id;
      countryOption.innerText = `${country.country_name}`;
      elements.countrySelect.appendChild(countryOption);
      elements.countryUpdateSelect.appendChild(countryOption.cloneNode(true));
      elements.countryFilterSelect.appendChild(countryOption.cloneNode(true));
    });
  } catch (error) {
    console.error("Error fetching country codes:", error);
  }
}

// Fetch and render users
async function loadUsers(page) {
  try {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      pageSize: state.pageSize.toString(),
      orderParams: JSON.stringify(state.orderParams),
      page: page.toString(),
    });
    updateUrlParams(state);
    const response = await fetchWithErrorHandling(
      `/crud/users/filtered?${queryParams.toString()}`
    );
    if(!response.ok) {
      showToastMessage(response.error, "error");
      return;
    }
    const { result, count } = await response.data;
    renderUserList(result);
    updatePagination(count, page);
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

// Render user list
function renderUserList(users) {
  console.log(users);
  elements.userListContainer.innerHTML = ""; // Clear previous list
  users.forEach((user) => {
    const userRow = document.createElement("tr");

    // Create cells for user attributes
    userRow.appendChild(createTableCell(user.id));
    userRow.appendChild(createTableCell(user.first_name));
    userRow.appendChild(createTableCell(user.last_name));
    userRow.appendChild(createTableCell(user.email));
    userRow.appendChild(createTableCell(user.phone_code));
    userRow.appendChild(createTableCell(user.phone));
    userRow.appendChild(createTableCell(user.country_name));
    userRow.appendChild(createTableCell(user.birth_date ? new Date(user.birth_date).toLocaleDateString() : ""));
    userRow.appendChild(createTableCell(user.gender));
    userRow.appendChild(createTableCell(user.address));
    userRow.appendChild(createTableCell(user.is_email_verified));
    userRow.appendChild(createTableCell(user.has_first_login));

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
function createTableCell(text) {
  const cell = document.createElement("td");
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
  const formData = new FormData(elements.userForm);
  const data = Object.fromEntries(formData);
  if(data.birth_date === ""){
    data.birth_date = null;
  } else {
    const birthDate = new Date(data.birth_date);
    if(birthDate > new Date()){
      showToastMessage("Birth date must be in the past", "error");
      return;
    }
  }
  try {
    const response = await fetchWithErrorHandling("/crud/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      showToastMessage("User created successfully!", "success");
      elements.userForm.reset();
      hideForm();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      loadUsers(state.currentPage);
    } else {
      showToastMessage(`Failed to create user: ${response.error}`, "error");
    }
  } catch (error) {
    console.error("Error creating user:", error);
  }
}

async function handleUpdateUser(event) {
  event.preventDefault();
  const formData = new FormData(elements.userUpdateForm);
  const data = Object.fromEntries(formData);
  if(data.birth_date === ""){
    data.birth_date = null;
  } else {
    const birthDate = new Date(data.birth_date);
    if(birthDate > new Date()){
      showToastMessage("Birth date must be in the past", "error");
      return;
    }
  }
  console.log(JSON.stringify(formData));
  try {
    const response = await fetchWithErrorHandling(`/crud/users/${state.userToUpdateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      showToastMessage("User updated successfully!", "success");
      elements.userUpdateForm.reset();
      state.filterParams = {};
      state.currentPage = 1;
      hideUpdateForm();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      loadUsers(state.currentPage);
    } else {
      showToastMessage(`Failed to update user: ${response.error}`, "error");
    }
  } catch (error) {
    console.error("Error updating user:", error);
  }
}

async function displayUpdateForm(userId) {
  try {
    const userResponse = await fetchWithErrorHandling(`/crud/users/${userId}`);
    if (!userResponse.ok) {
      showToastMessage(userResponse.error, "error");
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
  elements.userUpdateForm["first_name"].value = user.first_name;
  elements.userUpdateForm["last_name"].value = user.last_name;
  elements.userUpdateForm["email"].value = user.email;
  elements.userUpdateForm["iso_country_code_id"].value =
    user.iso_country_code_id;
  elements.userUpdateForm["phone"].value = user.phone;
  if(user.birth_date){
    elements.userUpdateForm["birth_date"].value = dayjs(user.birth_date).format("YYYY-MM-DD");
  }
  elements.userUpdateForm["country_id"].value = user.country_id;
  elements.userUpdateForm["gender_id"].value = user.gender_id;
  elements.userUpdateForm["address"].value = user.address;
  elements.userUpdateForm["is_email_verified"].value = user.is_email_verified;
}

// Handle user deletion
async function handleDeleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    const response = await fetchWithErrorHandling(`/crud/users/${userId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      showToastMessage("User deleted successfully!", "success");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      loadUsers(state.currentPage);
    } else {
      showToastMessage(`Failed to delete user: ${response.error}`, "error");
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
  state.filterParams = filterParams;

  if(elements.orderBySelect.value){
    state.orderParams = [elements.orderBySelect.value.split(" ")];
  } else {
    state.orderParams = [];
  }

  // Reload users with the new filters
  state.currentPage = 1;
  loadUsers(state.currentPage);
}
