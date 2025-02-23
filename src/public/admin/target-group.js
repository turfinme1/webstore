import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

// Centralized state object
const state = {
  currentPage: 1,
  currentTargetGroupPage: 1,
  pageSize: 1000,
  searchParams: {},
  filterParams: {},
  orderParams: [],
  countries: [],
  userToUpdateId: null,
  userStatus: null,
  userIds: [],
  targetGroupFilterParams: {},
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
  countryCodeUpdateSelect: document.getElementById("iso_country_code_id_update"),
  countryUpdateSelect: document.getElementById("country_id_update"),
  showFilterButton: document.getElementById("show-filter-btn"),
  cancelFilterButton: document.getElementById("cancel-filter-btn"),
  filterContainer: document.getElementById("filter-container"),
  filterForm: document.getElementById("filter-form"),
  orderBySelect: document.getElementById("order_by"),

  targetGroupListContainer: document.getElementById("target-group-list"),
  targetGroupPaginationContainer: document.getElementById("pagination-container-groups"),
  targetGroupCurrentPageDisplay: document.getElementById("current-page-display-groups"),
  targetGroupResultCountDisplay: document.getElementById("result-count-groups"),
  showTargetGroupListButton: document.getElementById("show-groups"),

  targetGroupFilterContainer: document.getElementById("target-group-filter-container"),
  targetGroupFilterForm: document.getElementById("target-group-filter-form"),
  cancelTargetGroupFilterButton: document.getElementById("cancel-target-group-filter-btn"),
  createdAtMin: document.getElementById("created_at_min"),
  createdAtMax: document.getElementById("created_at_max"),
  updatedAtMin: document.getElementById("updated_at_min"),
  updatedAtMax: document.getElementById("updated_at_max"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  state.userStatus = userStatus;
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);
  if (!hasPermission(userStatus, "read", "users")) {
    elements.mainContainer.innerHTML = "<h1>User Management</h1>";
    return;
  }
  if (!hasPermission(userStatus, "create", "users")) {
    elements.showFormButton.style.display = "none";
  }
  attachEventListeners();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  elements.createdAtMin.value = yesterday.toISOString().slice(0, 19);
  elements.createdAtMax.value = new Date().toISOString().slice(0, 19);
  elements.updatedAtMin.value = yesterday.toISOString().slice(0, 19);
  elements.updatedAtMax.value = new Date().toISOString().slice(0, 19);
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

  elements.orderBySelect.addEventListener("change", () => {
    loadTargetGroups(state.currentTargetGroupPage);
  });
  elements.showTargetGroupListButton.addEventListener("click", () => {
    showTargetGroupFilterForm();
    loadTargetGroups(state.currentTargetGroupPage);
  });

  // elements.showTargetGroupFilterButton.addEventListener("click", showTargetGroupFilterForm);
  elements.cancelTargetGroupFilterButton.addEventListener("click", hideTargetGroupFilterForm);
  elements.targetGroupFilterForm.addEventListener("submit", handleFilterTargetGroups);
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
  hideTargetGroupFilterForm();

  elements.filterContainer.style.display = "block";
  elements.formContainer.style.display = "none";
  elements.formUpdateContainer.style.display = "none";
}

function hideFilterForm() {
  elements.filterContainer.style.display = "none";
}

function showTargetGroupFilterForm() {
  elements.targetGroupFilterContainer.style.display = "block";
  elements.formContainer.style.display = "none";
  elements.formUpdateContainer.style.display = "none";
  elements.filterContainer.style.display = "none";
}

function hideTargetGroupFilterForm() {
  elements.targetGroupFilterContainer.style.display = "none";
}

// Fetch and render users
async function loadUsers(page) {
  try {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      pageSize: state.pageSize.toString(),
      // orderParams: JSON.stringify(state.orderParams),
      page: page.toString(),
    });

    const response = await fetchWithErrorHandling(
      `/crud/users/filtered?${queryParams.toString()}`
    );
    if(!response.ok){
      showToastMessage(response.error, 'error');
      return;
    }
    const { result, count } = await response.data;
    
    state.userIds = result.map(user => user.id);
    renderUserList(result);

    if(parseInt(count) > state.pageSize){
      showToastMessage("Only the first 1000 users are displayed.", 'error');
    }

    const userTableSection = document.getElementById("user-table-section");
    userTableSection.scrollIntoView({ behavior: "smooth" });
    // updatePagination(count, page);
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

// Render user list
function renderUserList(users) {
  console.log(users);
  elements.userListContainer.innerHTML = ""; // Clear previous list
  elements.resultCountDisplay.textContent = "";

  if(users?.length){
    elements.resultCountDisplay.textContent = `Displaying ${users.length} results`;
  }
  users.forEach((user) => {
    const userRow = document.createElement("tr");

    // Create cells for user attributes
    userRow.appendChild(createTableCell(user.id));
    userRow.appendChild(createTableCell(user.first_name));
    userRow.appendChild(createTableCell(user.last_name));
    userRow.appendChild(createTableCell(user.email));
    userRow.appendChild(createTableCell(user.birth_date ? new Date(user.birth_date).toLocaleDateString() : ""));
    userRow.appendChild(createTableCell(user.gender));
    userRow.appendChild(createTableCell(formatDateTime(user.created_at)));
    userRow.appendChild(createTableCell(user.days_since_registration, "right"));
    userRow.appendChild(createTableCell(user.days_since_order, "right"));

    // Actions (Update/Delete)
    // const actionCell = createTableCell("");
    // if (hasPermission(state.userStatus, "update", "users")) {
    //   actionCell.appendChild(
    //     createActionButton("Edit", "btn-warning", () =>
    //       displayUpdateForm(user.id)
    //     )
    //   );
    // }

    // if (hasPermission(state.userStatus, "delete", "users")) {
    //   actionCell.appendChild(
    //     createActionButton("Delete", "btn-danger", () =>
    //       handleDeleteUser(user.id)
    //     )
    //   );
    // }
    // userRow.appendChild(actionCell);

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

// Handle target group creation
async function handleCreateTargetGroup(event) {
  event.preventDefault();
  const formData = new FormData(elements.targetGroupCreateForm);
  const data = Object.fromEntries(formData);
  data.filters = {
    query: {
      filterParams: state.filterParams,
    }
  }

  const queryParams = new URLSearchParams({
    filterParams: JSON.stringify(state.filterParams),
    pageSize: state.pageSize.toString(),
    orderParams: JSON.stringify(state.orderParams),
    page: "1",
  });

  // const response = await fetchWithErrorHandling(
  //   `/crud/users/filtered?${queryParams.toString()}`
  // );
  // if(!response.ok){
  //   showToastMessage(response.error, 'error');
  //   return;
  // }
  // const { result, count } = await response.data;
  // state.userIds = result.map(user => user.id);

  // data.users = state.userIds;
  data.users = {
    query: {
      filterParams: state.filterParams,
    }
  }
  console.log(JSON.stringify(data));
  try {
    const response = await fetchWithErrorHandling("/crud/target-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      showToastMessage('Target group created successfully', 'success');
      elements.targetGroupCreateForm.reset();
      hideForm();
      loadUsers(state.currentPage);
    } else {
      showToastMessage(response.error, 'error');
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
    const response = await fetchWithErrorHandling(`/crud/users/${state.userToUpdateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (response.ok) {
      showToastMessage('User updated successfully', 'success');
      elements.targetGroupUpdateForm.reset();
      state.filterParams = {};
      state.currentPage = 1;
      hideUpdateForm();
      await new Promise(resolve => setTimeout(resolve, 1000));
      loadUsers(state.currentPage);
    } else {
      showToastMessage(response.error, 'error');
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
  const filterParams = Object.fromEntries(
    Object.entries(Object.fromEntries(formData)).filter(([_, value]) => value.trim() !== "")
  );

  if(filterParams.birth_date){
    filterParams.birth_date = dayjs(filterParams.birth_date).format("YYYY-MM-DD");
  }

  if(filterParams.birth_day){
    if(filterParams.birth_month) {
      filterParams.birth_date = dayjs().set('month', filterParams.birth_month - 1).set('date', filterParams.birth_day).format("YYYY-MM-DD");
    } else {
      alert("Please select a month.");
      return;
    }
    delete filterParams.birth_month;
  }

  if(filterParams.first_name) {
    let firstNameFilter = filterParams.first_name.replace(/\s/g, "").split(",");
    if(firstNameFilter.length > 1 && firstNameFilter[0]){
      filterParams.first_name = firstNameFilter;
    }
  }

  if(filterParams.gender_id){
    const genderSelect = document.getElementById('gender_id'); // Replace with your select element's ID
    const selectedOption = genderSelect.options[genderSelect.selectedIndex];
    filterParams.gender = selectedOption.text;
  } 

  if(filterParams.days_since_order_min || filterParams.days_since_order_max) {
    filterParams["days_since_order"] = {};
    if(filterParams.days_since_order_min) {
      filterParams["days_since_order"].min = filterParams.days_since_order_min;
    }
    if(filterParams.days_since_order_max) {
      filterParams["days_since_order"].max = filterParams.days_since_order_max;
    }

    delete filterParams.days_since_order_min;
    delete filterParams.days_since_order_max;
  }

  if(filterParams.days_since_registration_min || filterParams.days_since_registration_max) {
    filterParams["days_since_registration"] = {};
    if(filterParams.days_since_registration_min) {
      filterParams["days_since_registration"].min = filterParams.days_since_registration_min;
    }
    if(filterParams.days_since_registration_max) {
      filterParams["days_since_registration"].max = filterParams.days_since_registration_max;
    }

    delete filterParams.days_since_registration_min;
    delete filterParams.days_since_registration_max;
  }

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

  if(filterParams.birth_day || filterParams.birth_month){
    if(!filterParams.birth_day){
      alert("Please select a day.");
      return;
    }
    if(!filterParams.birth_month){
      alert("Please select a month.");
      return;
    }
    filterParams.birth_date = dayjs().set('month', filterParams.birth_month - 1).set('date', filterParams.birth_day).format("YYYY-MM-DD");
  }
  delete filterParams.birth_day;
  delete filterParams.birth_month;

  let firstNameFilter = filterParams.first_name.replace(/\s/g, "").split(",");
  if(firstNameFilter.length > 0 && firstNameFilter[0]){
    filterParams.first_name = firstNameFilter;
  } else {
    delete filterParams.first_name;
  }

  const daysSinceOrderMin = parseInt(formData.get("days_since_order_min"));
  const daysSinceOrderMax = parseInt(formData.get("days_since_order_max"));
  if((daysSinceOrderMin && daysSinceOrderMax) && (daysSinceOrderMin > daysSinceOrderMax)) {
    alert("Days Since Order Min should be less than Days Since Order Max");
    return;
  }

  if (daysSinceOrderMin >= 0 || daysSinceOrderMax >= 0) {
    filterParams["days_since_order"] = {};
    if(daysSinceOrderMin >= 0) {
      filterParams["days_since_order"].min = daysSinceOrderMin;
    }
    if(daysSinceOrderMax >= 0) {
      filterParams["days_since_order"].max = daysSinceOrderMax;
    }
  }
  delete filterParams["days_since_order_min"];
  delete filterParams["days_since_order_max"];
  
  const daysSinceRegistrationMin = parseInt(formData.get("days_since_registration_min"));
  const daysSinceRegistrationMax = parseInt(formData.get("days_since_registration_max"));
  if((daysSinceRegistrationMin && daysSinceRegistrationMax) && (daysSinceRegistrationMin > daysSinceRegistrationMax)) {
    alert("Days Since Registration Min should be less than Days Since Registration Max");
    return;
  }

  if (daysSinceRegistrationMin >= 0|| daysSinceRegistrationMax >= 0) {
    filterParams["days_since_registration"] = {};
    if(daysSinceRegistrationMin >= 0) {
      filterParams["days_since_registration"].min = daysSinceRegistrationMin;
    }
    if(daysSinceRegistrationMax >= 0) {
      filterParams["days_since_registration"].max = daysSinceRegistrationMax;
    }
  }
  delete filterParams["days_since_registration_min"];
  delete filterParams["days_since_registration_max"];

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


// target group list
async function handleFilterTargetGroups(event) {
  event.preventDefault();
  const formData = new FormData(elements.targetGroupFilterForm);
  const filterParams = {};

  if (formData.get("name")?.trim()) {
      filterParams.name = formData.get("name").trim();
  }

  const userCountMin = parseInt(formData.get("user_count_min"));
  const userCountMax = parseInt(formData.get("user_count_max"));
  if (userCountMin || userCountMax) {
      filterParams.user_count = {};
      if (userCountMin) filterParams.user_count.min = userCountMin;
      if (userCountMax) filterParams.user_count.max = userCountMax;
  }
  if(userCountMax < userCountMin){
    showToastMessage("User Count Min should be less than User Count Max", 'error');
    return;
  }

  const createdAtMin = formData.get("created_at_min");
  const createdAtMax = formData.get("created_at_max");
  if (createdAtMin || createdAtMax) {
      filterParams.created_at = {};
      if (createdAtMin) filterParams.created_at.min = createdAtMin;
      if (createdAtMax) filterParams.created_at.max = createdAtMax;
  }
  if(createdAtMin && createdAtMax && (new Date(createdAtMax) < new Date(createdAtMin))){
    showToastMessage("Created At Min should be less than Created At Max", 'error');
    return;
  }
  if(createdAtMax && new Date(createdAtMax) > new Date()){
    showToastMessage("Created At Max should be in the past", 'error');
    return;
  }
  if(createdAtMin && new Date(createdAtMin) > new Date()){
    showToastMessage("Created At Min should be in the past", 'error');
    return;
  }

  const updatedAtMin = formData.get("updated_at_min");
  const updatedAtMax = formData.get("updated_at_max");
  if (updatedAtMin || updatedAtMax) {
      filterParams.updated_at = {};
      if (updatedAtMin) filterParams.updated_at.min = updatedAtMin;
      if (updatedAtMax) filterParams.updated_at.max = updatedAtMax;
  }
  if(updatedAtMax && updatedAtMax && (new Date(updatedAtMax) < new Date(updatedAtMin))){
    showToastMessage("Updated At Min should be less than Updated At Max", 'error');
    return;
  }
  if(updatedAtMax && new Date(updatedAtMax) > new Date()){
    showToastMessage("Updated At Max should be in the past", 'error');
    return;
  }
  if(updatedAtMin && new Date(updatedAtMin) > new Date()){
    showToastMessage("Updated At Min should be in the past", 'error');
    return;
  }

  state.targetGroupFilterParams = filterParams;
  state.currentTargetGroupPage = 1;
  await loadTargetGroups(state.currentTargetGroupPage);
}

async function loadTargetGroups(page) {
  try {
    if(elements.orderBySelect.value){
      state.orderParams = [elements.orderBySelect.value.split(" ")];
    } else {
      state.orderParams = [];
    }

    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.targetGroupFilterParams),
      pageSize: "10",
      page: page.toString(),
    });

    const response = await fetchWithErrorHandling(
      `/crud/target-groups/filtered?${queryParams.toString()}`
    );
    if(!response.ok){
      showToastMessage(response.error, 'error');
      return;
    }
    const { result, count } = await response.data;
    renderTargetGroupList(result);
    updateTargetGroupPagination(count, page);
  } catch (error) {
    console.error("Error loading target groups:", error);
  }
}

// Render target group list
function renderTargetGroupList(targetGroups) {
  elements.targetGroupListContainer.innerHTML = ""; // Clear previous list
  targetGroups.forEach((targetGroup) => {
    const targetGroupRow = document.createElement("tr");

    // Create cells for target group attributes
    targetGroupRow.appendChild(createTableCell(targetGroup.id));
    targetGroupRow.appendChild(createTableCell(targetGroup.name));
    targetGroupRow.appendChild(createTableCell(targetGroup.user_count));
    targetGroupRow.appendChild(createTableCell(formatFiltersObject(targetGroup.filters)));
    targetGroupRow.appendChild(createTableCell(formatDateTime(targetGroup.created_at)));
    targetGroupRow.appendChild(createTableCell(formatDateTime(targetGroup.updated_at)));

    // Actions (Update/Delete)
    const actionCell = createTableCell("");
    actionCell.appendChild(
      createActionButton("View Users", "btn-warning",async () => {

        const targetGroupDetailResponse = await fetchWithErrorHandling(`/crud/target-groups/${targetGroup.id}`);
        if(!targetGroupDetailResponse.ok){
          showToastMessage(response.error, 'error');
          return;
        }

        renderUserList(targetGroupDetailResponse.data.users);
        const userTableSection = document.getElementById("user-table-section");
        userTableSection.scrollIntoView({ behavior: "smooth" });
      })
    );
    actionCell.appendChild(
      createActionButton("Export to CSV", "btn-warning", () =>
        handleExportCsv(targetGroup.id)
      )
    );
    targetGroupRow.appendChild(actionCell);

    elements.targetGroupListContainer.appendChild(targetGroupRow);
  });
}

// Update target group pagination
function updateTargetGroupPagination(totalTargetGroups, page) {
  const totalPages = Math.ceil(totalTargetGroups / state.pageSize);
  elements.targetGroupPaginationContainer.innerHTML = "";
  elements.targetGroupCurrentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;
  elements.targetGroupResultCountDisplay.textContent = `Found ${totalTargetGroups} results`;

  if (totalTargetGroups == 0) {
    elements.targetGroupCurrentPageDisplay.innerHTML = "";
    return;
  }

  elements.targetGroupPaginationContainer.appendChild(
    createPaginationButton("Previous", page > 1, () => loadTargetGroups(page - 1))
  );
  elements.targetGroupPaginationContainer.appendChild(
    createPaginationButton("Next", page < totalPages, () => loadTargetGroups(page + 1))
  );
}

// Handle target group deletion
async function handleExportCsv(targetGroupId) {
  try {
    // updateAciveFilters();
    // toggleExportLoadingState();

    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify({id: targetGroupId}),
    });
    const response = await fetch(`/api/target-groups/filtered/export/csv?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to export orders");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `targetGroup.csv`;
    a.click();

    URL.revokeObjectURL(url);
    // toggleExportLoadingState();
  } catch (error) {
    console.log(error);
    if (!navigator.onLine) {
      showToastMessage('No internet connection', 'error');
    } else {
        showToastMessage('Export failed.', 'error');
    }
    // toggleExportLoadingState();
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "-";
  
  return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
  })
}

function formatFiltersObject(filters) {
  if (!filters?.query?.filterParams) return "";
  
  function formatValue(value) {
      if (value === null || value === undefined) return '';
      
      if (typeof value === 'object') {
          if (Array.isArray(value)) {
              return value.join(', ');
          }
          
          // Handle min/max objects
          if ('min' in value || 'max' in value) {
              const parts = [];
              if ('min' in value) parts.push(`min: ${value.min}`);
              if ('max' in value) parts.push(`max: ${value.max}`);
              return parts.join(', ');
          }
          
          // Handle nested objects
          return Object.entries(value)
              .map(([k, v]) => `${k}: ${formatValue(v)}`)
              .join(', ');
      }
      
      return value.toString();
  }

  return Object.entries(filters.query.filterParams)
      .map(([key, value]) => {
        if(key === "gender_id") {
          key = "gender";
          if (value == 1) {
            value = "Male";
          } else if (value == 2) {
            value = "Female";
          } 
          else {
            value = "All"
          }
        }
        return `${key.replaceAll("_", " ")}: ${formatValue(value)}`
      })
      .join(", ");
}
  