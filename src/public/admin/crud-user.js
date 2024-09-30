import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  searchParams: {},
  countries: [],
  userToUpdateId: null,
};

// DOM elements
const elements = {
  formContainer: document.getElementById("form-container"),
  formUpdateContainer: document.getElementById("form-update-container"),
  userListContainer: document.getElementById("user-list"),
  paginationContainer: document.getElementById("pagination-container"),
  currentPageDisplay: document.getElementById("current-page-display"),
  resultCountDisplay: document.getElementById("result-count"),
  userForm: document.getElementById("user-form"),
  userUpdateForm: document.getElementById("user-update-form"),
  searchButton: document.getElementById("search-btn"),
  cancelButton: document.getElementById("cancel-btn"),
  cancelUpdateButton: document.getElementById("cancel-update-btn"),
  searchInput: document.getElementById("search-input"),
  showFormButton: document.getElementById("show-form-btn"),
  countryCodeSelect: document.getElementById("iso_country_code_id"),
  countrySelect: document.getElementById("country_id"),
  countryCodeUpdateSelect: document.getElementById("iso_country_code_id_update"),
  countryUpdateSelect: document.getElementById("country_id_update"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
  loadUsers(state.currentPage);
  loadCountryCodes();
});

// Attach event listeners
function attachEventListeners() {
  elements.cancelButton.addEventListener("click", hideForm);
  elements.cancelUpdateButton.addEventListener("click", hideUpdateForm);
  elements.showFormButton.addEventListener("click", showForm);

  elements.searchButton.addEventListener("click", () => {
    state.searchParams.keyword = elements.searchInput.value.trim();
    state.currentPage = 1;
    hideForm();
    hideUpdateForm();
    loadUsers(state.currentPage);
  });

  elements.userForm.addEventListener("submit", handleCreateUser);
  elements.userUpdateForm.addEventListener("submit", handleUpdateUser);
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
}

function showUpdateForm() {
  elements.formUpdateContainer.style.display = "block";
  elements.formContainer.style.display = "none";
}

// Fetch countries
async function loadCountryCodes() {
  try {
    const response = await fetch("/crud/iso-country-codes");
    if (!response.ok) throw new Error("Failed to fetch country codes");
    state.countries = await response.json();
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
    });
  } catch (error) {
    console.error("Error fetching country codes:", error);
  }
}

// Fetch and render users
async function loadUsers(page) {
  try {
    const queryParams = new URLSearchParams({
      searchParams: JSON.stringify(state.searchParams),
      pageSize: state.pageSize.toString(),
      page: page.toString(),
    });

    const response = await fetch(`/crud/users?${queryParams.toString()}`);
    const users = await response.json();
    const totalUsers = 5;
    renderUserList(users);
    updatePagination(totalUsers, page);
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
    userRow.appendChild(createTableCell(user.gender));
    userRow.appendChild(createTableCell(user.address));
    userRow.appendChild(createTableCell(user.is_email_verified));
    userRow.appendChild(createTableCell(user.has_first_login));

    // Actions (Update/Delete)
    const actionCell = createTableCell("");
    actionCell.appendChild(
      createActionButton("Update", "btn-warning", () =>
        displayUpdateForm(user.id)
      )
    );
    actionCell.appendChild(
      createActionButton("Delete", "btn-danger", () =>
        handleDeleteUser(user.id)
      )
    );
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

  if (totalUsers === 0) return;

  elements.paginationContainer.appendChild(
    createPaginationButton("Previous", page > 1, () => loadUsers(page - 1))
  );
  elements.paginationContainer.appendChild(
    createPaginationButton("Next", page < totalPages, () =>
      loadUsers(page + 1)
    )
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
  console.log(JSON.stringify(formData));
  try {
    const response = await fetch("/crud/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (response.ok) {
      alert("User created successfully!");
      elements.userForm.reset();
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
  const formData = new FormData(elements.userUpdateForm);
  console.log(JSON.stringify(formData));
  try {
    const response = await fetch(`/crud/users/${state.userToUpdateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (response.ok) {
      alert("User updated successfully!");
      elements.userUpdateForm.reset();
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
  elements.userUpdateForm["first_name"].value = user.first_name;
  elements.userUpdateForm["last_name"].value = user.last_name;
  elements.userUpdateForm["email"].value = user.email;
  elements.userUpdateForm["iso_country_code_id"].value = user.iso_country_code_id;
  elements.userUpdateForm["phone"].value = user.phone;
  elements.userUpdateForm["country_id"].value = user.country_id;
  elements.userUpdateForm["gender_id"].value = user.gender_id;
  elements.userUpdateForm["address"].value = user.address;
  elements.userUpdateForm["is_email_verified"].value = user.is_email_verified;
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
