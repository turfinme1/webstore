import { getUserStatus, attachLogoutHandler, hasPermission } from "./auth.js";
import { createNavigation, createBackofficeNavigation } from "./navigation.js";


// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 300,
  userStatus: null,
  searchParams: {},
  filterParams: {},
  groupParams: [],
  statusCodes: [
    { id: 1, code: 1, message: "Internal Server Error" },
    { id: 2, code: 2, message: "Unauthorized" },
    { id: 3, code: 3, message: "Invalid Session" },
    { id: 4, code: 4, message: "Invalid Login" },
    { id: 5, code: 5, message: "Invalid Token" },
    { id: 6, code: 6, message: "Invalid Input" },
    { id: 7, code: 7, message: "Invalid Body" },
    { id: 8, code: 8, message: "Invalid Query Params" },
    { id: 9, code: 9, message: "Wrong Password" },
    { id: 10, code: 10, message: "Rate Limited" },
    { id: 11, code: 11, message: "No Changes" },
    { id: 12, code: 12, message: "Duplicate" },
    { id: 13, code: 13, message: "Not Found" },
    { id: 14, code: 14, message: "Registration Success" },
    { id: 15, code: 15, message: "Login Success" },
    { id: 16, code: 16, message: "Profile Update Success" },
    { id: 17, code: 17, message: "Password Reset Success" },
    { id: 18, code: 18, message: "Update Success" },
    { id: 19, code: 19, message: "Delete Success" },
    { id: 20, code: 20, message: "Create Success" },
    { id: 21, code: 21, message: "Order Complete Success" },
    { id: 22, code: 22, message: "Order Complete Failure" },
    { id: 23, code: 23, message: "Cart Prices Changed" },
    { id: 24, code: 24, message: "Cron Success" },
    { id: 25, code: 25, message: "Cron Failure" },
    { id: 26, code: 26, message: "Role Change Success" },
    { id: 27, code: 27, message: "Permission Change Success" },
  ],
  logLevels: ["INFO", "ERROR"],
  columnsToDisplay: [
    { key: "id", label: "Id" },
    { key: "created_at", label: "Created At" },
    { key: "status_code", label: "Status Code" },
    { key: "log_level", label: "Log Level" },
    { key: "short_description", label: "Short Description" },
    { key: "long_description", label: "Long Description" },
    { key: "debug_info", label: "Debug Info" },
    { key: "user_id", label: "User Id" },
    { key: "admin_user_id", label: "Admin User Id" },
  ]
};

// DOM elements
const elements = {
  mainContainer: document.getElementById("main-container"),
  logListContainer: document.getElementById("log-list"),
  paginationContainer: document.getElementById("pagination-container"),
  currentPageDisplay: document.getElementById("current-page-display"),
  resultCountDisplay: document.getElementById("result-count"),
  resultCountGroupDisplay: document.getElementById("result-group-count"),
  filterForm: document.getElementById("filter-form"),
  statusCodeFilterSelect: document.getElementById("status_code_filter"),
  logLevelFilterSelect: document.getElementById("log_level_filter"),
  showFilterButton: document.getElementById("show-filter-btn"),
  cancelFilterButton: document.getElementById("cancel-filter-btn"),
  filterContainer: document.getElementById("filter-container"),
  groupByCreatedAtSelect: document.getElementById("group_by_created_at"),
  groupByStatusCodeSelect: document.getElementById("group_by_status_code"),
  groupByLogLevelSelect: document.getElementById("group_by_log_level"),
  logTableHeader: document.getElementById("log-table-header"),
  spinner: document.getElementById("spinner"),
  createdAtMin : document.getElementById("created_at_min"),
  createdAtMax : document.getElementById("created_at_max"),
  rowCount: document.getElementById("row-count"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  elements.createdAtMin.value = yesterday.toISOString().split("T")[0];
  elements.createdAtMax.value = new Date().toISOString().split("T")[0]; 
  
  const userStatus = await getUserStatus();
  state.userStatus = userStatus;
  createNavigation(userStatus);
  await attachLogoutHandler();
  createBackofficeNavigation(userStatus);

  if (!hasPermission(userStatus, "read", "report-logs")) {
    elements.mainContainer.innerHTML = "<h1>Log Management</h1>";
    return;
  }

  attachEventListeners();
  loadStatusCodes();
  // loadLogs(state.currentPage);
});

// Attach event listeners
function attachEventListeners() {
  elements.showFilterButton.addEventListener("click", showFilterForm);
  elements.cancelFilterButton.addEventListener("click", hideFilterForm);
  elements.filterForm.addEventListener("submit", handleFilterLogs);
}

// Show and hide filter form
function showFilterForm() {
  elements.filterContainer.style.display = "block";
}

function hideFilterForm() {
  elements.filterContainer.style.display = "none";
}

// Fetch and load status codes for filtering
async function loadStatusCodes() {
  try {
    // const response = await fetch("/crud/status-codes");
    // if (!response.ok) throw new Error("Failed to fetch status codes");
    // state.statusCodes = await response.json();

    const allStatusOption = document.createElement("option");
    allStatusOption.value = "";
    allStatusOption.innerText = "All Status Codes";
    elements.statusCodeFilterSelect.appendChild(allStatusOption);

    state.statusCodes.forEach((code) => {
      const option = document.createElement("option");
      option.value = code.id;
      option.innerText = `${code.code} - ${code.message}`;
      elements.statusCodeFilterSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching status codes:", error);
  }
}

// Handle log filtering and grouping
async function handleFilterLogs(event) {
  event.preventDefault();
  const formData = new FormData(elements.filterForm);
  const groupParams = [];

  // Construct filterParams
  const filterParams = {};
  formData.forEach((value, key) => {
    if (value) filterParams[key] = value;
  });

  const createdAtMin = formData.get("created_at_min");
  const createdAtMax = formData.get("created_at_max");
  if (createdAtMin || createdAtMax) {
    filterParams["created_at"] = {};
    if(createdAtMin) {
      filterParams["created_at"].min = createdAtMin;
    }
    if(createdAtMax) {
      filterParams["created_at"].max = createdAtMax;
    }
    delete filterParams["created_at_min"];
    delete filterParams["created_at_max"];
  }

  state.filterParams = filterParams;

  // Group by Created At
  const createdAtGrouping = elements.groupByCreatedAtSelect.value;
  if (createdAtGrouping) {
    groupParams.push({
      column: "created_at",
      granularity: createdAtGrouping,
    });
  }
  
  // Group by Status Code
  const statusCodeGrouping = elements.groupByStatusCodeSelect.value;
  if (statusCodeGrouping) {
    groupParams.push({ column: "status_code" });
  }

  // Group by Log Level
  const logLevelGrouping = elements.groupByLogLevelSelect.value;
  if (logLevelGrouping) {
    groupParams.push({ column: "log_level" });
  }

  state.groupParams = groupParams;

  state.currentPage = 1;
  loadLogs(state.currentPage);
}

// Fetch and load logs with groupParams included
async function loadLogs(page) {
  try {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      groupParams: JSON.stringify(state.groupParams),
      pageSize: state.pageSize.toString(),
      page: page.toString(),
    });
    toggleExportLoadingState();
    const response = await fetch(`/crud/logs/filtered?${queryParams.toString()}`);
    const { result, count, groupCount } = await response.json();

    state.columnsToDisplay = state.columnsToDisplay.filter(col => col.key !== 'count');
    if(state.columnsToDisplay[0].key !== 'id') {
      state.columnsToDisplay.unshift({ key: "id", label: "Id" });
    }
    if (result.length > 0 && result[0].hasOwnProperty('count')) {
      state.columnsToDisplay.push({ key: "count", label: "Count" });
      state.columnsToDisplay = state.columnsToDisplay.filter(col => col.key !== 'id');
    }
    
    toggleExportLoadingState(true);
    renderLogList(result);
    // updatePagination(count, page, groupCount);
    
    if(parseInt(count) > state.pageSize) {
      alert(`Please note that only the first ${state.pageSize} records are displayed. Please filter your search to view more records.`);
    }
  } catch (error) {
    toggleExportLoadingState(true);
    console.error("Error loading logs:", error);
  }
}

// Render log list
function renderLogList(logs) {
  elements.logListContainer.innerHTML = ""; // Clear previous list
  elements.logTableHeader.innerHTML = ""; // Clear previous headers
  elements.rowCount.textContent = "";
  
  if (logs.length === 0) {
    elements.logListContainer.innerHTML = "<tr><td colspan='8'>No logs found.</td></tr>";
    return;
  }
  elements.rowCount.textContent = `Showing ${logs.length} records`;
  // Generate table headers based on grouping
  state.columnsToDisplay.forEach(({ label }) => {
    const th = document.createElement("th");
    th.textContent = label;
    elements.logTableHeader.appendChild(th);
  });

  // Generate table rows
  logs.forEach((log) => {
    const logRow = document.createElement("tr");

    state.columnsToDisplay.forEach(({ key }) => {
      let cellValue = log[key];

      // Handle date formatting
      if (key.includes("created_at") && cellValue) {
        cellValue = new Date(cellValue).toLocaleString();
        if(state.groupParams.length > 0) {
          const groupParam = state.groupParams[0];

          if(groupParam.granularity === "day") {
            cellValue = new Date(cellValue).toLocaleDateString();
          } else if(groupParam.granularity === "month") {
            cellValue = new Date(cellValue).toLocaleDateString();
          } else if(groupParam.granularity === "year") {
            cellValue = new Date(cellValue).getFullYear();
          }
        }
      }

      // Handle null or undefined values
      if (cellValue === null || cellValue === undefined) {
        cellValue = "---";
      }

      const direction = ["count"].includes(key) ? "right" : "left";
      logRow.appendChild(createTableCell(cellValue, direction));
    });

    elements.logListContainer.appendChild(logRow);
  });
}

// Utility function to format header names
function formatHeader(header) {
  return header
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Create table cell
function createTableCell(text, align = "left") {
  const cell = document.createElement("td");
  cell.textContent = text;
  cell.style.textAlign = align;
  return cell;
}

// Update pagination
function updatePagination(totalLogs, page, groupCount) {
  const totalPages = Math.ceil(totalLogs / state.pageSize);
  elements.paginationContainer.innerHTML = "";
  elements.resultCountGroupDisplay.textContent = "";

  elements.currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;
  elements.resultCountDisplay.textContent = `Found ${totalLogs} records`;

  if(groupCount){
    elements.resultCountGroupDisplay.textContent = `Group total count ${groupCount}`;
  }

  if (totalLogs == 0) {
    elements.currentPageDisplay.innerHTML = "";
    elements.resultCountDisplay.textContent = "";
    return;
  }

  elements.paginationContainer.appendChild(
    createPaginationButton("Previous", page > 1, () => loadLogs(page - 1))
  );
  elements.paginationContainer.appendChild(
    createPaginationButton("Next", page < totalPages, () => loadLogs(page + 1))
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

function toggleExportLoadingState(reset = false) {
  if(reset) {
    elements.spinner.style.display = "none";
    return;
  }
  elements.spinner.style.display = elements.spinner.style.display === "none" ? "inline-block" : "none";
}