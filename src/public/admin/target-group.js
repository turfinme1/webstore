import { getUserStatus, attachLogoutHandler, hasPermission } from "./auth.js";
import { createNavigation, createBackofficeNavigation } from "./navigation.js";

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
  userIds: [],
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
  targetGroupCreateForm: document.getElementById("user-form"),
  targetGroupUpdateForm: document.getElementById("user-update-form"),
  cancelButton: document.getElementById("cancel-btn"),
  cancelUpdateButton: document.getElementById("cancel-update-btn"),
  searchInput: document.getElementById("search-input"),
  showFormButton: document.getElementById("show-form-btn"),
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
  await attachLogoutHandler();
  createBackofficeNavigation(userStatus);
  if (!hasPermission(userStatus, "read", "users")) {
    elements.mainContainer.innerHTML = "<h1>User Management</h1>";
    return;
  }
  if (!hasPermission(userStatus, "create", "users")) {
    elements.showFormButton.style.display = "none";
  }
  attachEventListeners();
//   loadUsers(state.currentPage);
  // loadCountryCodes();
});

// Attach event listeners
function attachEventListeners() {
  elements.cancelButton.addEventListener("click", hideForm);
  elements.showFormButton.addEventListener("click", showForm);
  elements.cancelUpdateButton.addEventListener("click", hideUpdateForm);
  elements.showFilterButton.addEventListener("click", showFilterForm);
  elements.cancelFilterButton.addEventListener("click", hideFilterForm);

  elements.targetGroupCreateForm.addEventListener("submit", handleCreateTargetGroup);
  elements.targetGroupUpdateForm.addEventListener("submit", handleUpdateUser);
  elements.filterForm.addEventListener("submit", handleFilterUsers);
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

    const response = await fetch(
      `/crud/users/filtered?${queryParams.toString()}`
    );
    const { result, count } = await response.json();
    
    state.userIds = result.map(user => user.id);
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
    userRow.appendChild(createTableCell(user.country_name));
    userRow.appendChild(createTableCell(user.birth_date ? new Date(user.birth_date).toLocaleDateString() : ""));
    userRow.appendChild(createTableCell(user.gender));

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
    createPaginationButton("Previous", page > 1, () => loadUsers(page - 1))
  );
  elements.paginationContainer.appendChild(
    createPaginationButton("Next", page < totalPages, () => loadUsers(page + 1))
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
async function handleCreateTargetGroup(event) {
  event.preventDefault();
  const formData = new FormData(elements.targetGroupCreateForm);
  const data = Object.fromEntries(formData);
  data.filters = getFilters();
  data.users = state.userIds;
  console.log(JSON.stringify(data));
  try {
    const response = await fetch("/crud/target-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      alert("Record created successfully!");
      elements.targetGroupCreateForm.reset();
      hideForm();
      loadUsers(state.currentPage);
    } else {
      const error = await response.json();
      alert(`Failed to create user: ${error.error}`);
    }
  } catch (error) {
    console.error("Error creating user:", error);
  }
}

async function handleUpdateUser(event) {
  event.preventDefault();
  const formData = new FormData(elements.targetGroupUpdateForm);
  console.log(JSON.stringify(formData));
  try {
    const response = await fetch(`/crud/users/${state.userToUpdateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (response.ok) {
      alert("Record updated successfully!");
      elements.targetGroupUpdateForm.reset();
      state.filterParams = {};
      state.currentPage = 1;
      hideUpdateForm();
      loadUsers(state.currentPage);
    } else {
      const error = await response.json();
      alert(`Failed to update user: ${error.error}`);
    }
  } catch (error) {
    console.error("Error updating user:", error);
  }
}

async function displayUpdateForm(userId) {
  try {
    const userResponse = await fetch(`/crud/users/${userId}`);
    const user = await userResponse.json();
    showUpdateForm();
    populateUpdateForm(user);
    state.userToUpdateId = userId;
  } catch (error) {
    console.error("Error loading user for update:", error);
  }
}

// Populate update form
function populateUpdateForm(user) {
  elements.targetGroupUpdateForm["first_name"].value = user.first_name;
  elements.targetGroupUpdateForm["last_name"].value = user.last_name;
  elements.targetGroupUpdateForm["email"].value = user.email;
  elements.targetGroupUpdateForm["iso_country_code_id"].value =
    user.iso_country_code_id;
  elements.targetGroupUpdateForm["phone"].value = user.phone;
  if(user.birth_date){
    elements.targetGroupUpdateForm["birth_date"].value = dayjs(user.birth_date).format("YYYY-MM-DD");
  }
  elements.targetGroupUpdateForm["country_id"].value = user.country_id;
  elements.targetGroupUpdateForm["gender_id"].value = user.gender_id;
  elements.targetGroupUpdateForm["is_email_verified"].value = user.is_email_verified;
}

// Handle user deletion
async function handleDeleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    const response = await fetch(`/crud/users/${userId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      alert("User deleted successfully!");
      loadUsers(state.currentPage);
    } else {
      const error = await response.json();
      alert(`Failed to delete user: ${error.error}`);
    }
  } catch (error) {
    console.error("Error deleting user:", error);
  }
}

function getFilters() {
  const formData = new FormData(elements.filterForm);
  const filterParams = Object.fromEntries(formData);


  if(filterParams.birth_date){
    filterParams.birth_date = dayjs(filterParams.birth_date).format("YYYY-MM-DD");
  } else {
    filterParams.birth_date = "All";
  }

  let firstNameFilter = filterParams.first_name.replace(/\s/g, "").split(",");
  if(firstNameFilter.length > 1){
    filterParams.first_name = firstNameFilter;
  } else {
    filterParams.first_name = "All";
  }

  if(filterParams.gender_id){
    const genderSelect = document.getElementById('gender_id'); // Replace with your select element's ID
    const selectedOption = genderSelect.options[genderSelect.selectedIndex];
    filterParams.gender = selectedOption.text;
  } else {
    filterParams.gender = "All";
  }
  delete filterParams.gender_id;

  return filterParams;
}

async function handleFilterUsers(event) {
  if (event){
    event.preventDefault();
  }
  const formData = new FormData(elements.filterForm);
  if (formData.get("country_id") === "") {
    formData.delete("country_id");
  }
  const filterParams = Object.fromEntries(formData);

  if(filterParams.birth_date){
    filterParams.birth_date = dayjs(filterParams.birth_date).format("YYYY-MM-DD");
  } else {
    delete filterParams.birth_date;
  }

  let firstNameFilter = filterParams.first_name.replace(/\s/g, "").split(",");
  if(firstNameFilter.length > 0){
    filterParams.first_name = firstNameFilter;
  } else {
    delete filterParams.first_name;
  }

  if(filterParams.gender_id){
    filterParams.gender_id = parseInt(filterParams.gender_id);
  } else {
    delete filterParams.gender_id;
  }

  state.filterParams = filterParams;

  // Reload users with the new filters
  state.currentPage = 1;
  loadUsers(state.currentPage);
}
