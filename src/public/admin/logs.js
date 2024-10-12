import { getUserStatus } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  searchParams: {},
  filterParams: {},
  groupParams: [],
  statusCodes: [],
  logLevels: ["INFO", "ERROR"],
  columnsToDisplay: [
    { key: "id", label: "Id" },
    { key: "admin_user_id", label: "Admin User Id" },
    { key: "user_id", label: "User Id" },
    { key: "status_code", label: "Status Code" },
    { key: "log_level", label: "Log Level" },
    { key: "short_description", label: "Short Description" },
    { key: "long_description", label: "Long Description" },
    { key: "debug_info", label: "Debug Info" },
    { key: "created_at", label: "Created At" },
  ]
};

// DOM elements
const elements = {
  logListContainer: document.getElementById("log-list"),
  paginationContainer: document.getElementById("pagination-container"),
  currentPageDisplay: document.getElementById("current-page-display"),
  resultCountDisplay: document.getElementById("result-count"),
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
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
  loadStatusCodes();
  loadLogs(state.currentPage);
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
    const response = await fetch("/crud/status-codes");
    if (!response.ok) throw new Error("Failed to fetch status codes");
    state.statusCodes = await response.json();

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
  hideFilterForm();
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

    const response = await fetch(`/crud/logs/filtered?${queryParams.toString()}`);
    const { result, count } = await response.json();

    state.columnsToDisplay = state.columnsToDisplay.filter(col => col.key !== 'count');
    if(state.columnsToDisplay[0].key !== 'id') {
      state.columnsToDisplay.unshift({ key: "id", label: "Id" });
    }
    if (result.length > 0 && result[0].hasOwnProperty('count')) {
      state.columnsToDisplay.push({ key: "count", label: "Count" });
      state.columnsToDisplay = state.columnsToDisplay.filter(col => col.key !== 'id');
    }

    renderLogList(result);
    updatePagination(count, page);
  } catch (error) {
    console.error("Error loading logs:", error);
  }
}

// Render log list
function renderLogList(logs) {
  elements.logListContainer.innerHTML = ""; // Clear previous list
  elements.logTableHeader.innerHTML = ""; // Clear previous headers

  if (logs.length === 0) {
    elements.logListContainer.innerHTML = "<tr><td colspan='8'>No logs found.</td></tr>";
    return;
  }

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
function updatePagination(totalLogs, page) {
  const totalPages = Math.ceil(totalLogs / state.pageSize);
  elements.paginationContainer.innerHTML = "";
  elements.currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;
  elements.resultCountDisplay.textContent = `Found ${totalLogs} results`;

  if (totalLogs == 0) {
    elements.currentPageDisplay.innerHTML = "";
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
