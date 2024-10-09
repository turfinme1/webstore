import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  searchParams: {},
  filterParams: {},
  statusCodes: [],
  logLevels: ["INFO", "ERROR"],
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
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
  loadLogs(state.currentPage);
  loadStatusCodes();
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

// Fetch and load logs
async function loadLogs(page) {
  try {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      pageSize: state.pageSize.toString(),
      page: page.toString(),
    });

    const response = await fetch(
      `/crud/logs/filtered?${queryParams.toString()}`
    );
    const { result, count } = await response.json();
    renderLogList(result);
    updatePagination(count, page);
  } catch (error) {
    console.error("Error loading logs:", error);
  }
}

// Render log list
function renderLogList(logs) {
  elements.logListContainer.innerHTML = ""; // Clear previous list
  logs.forEach((log) => {
    const logRow = document.createElement("tr");

    // Create cells for log attributes
    logRow.appendChild(createTableCell(log.id));
    logRow.appendChild(createTableCell(log.log_level));
    logRow.appendChild(createTableCell(log.status_code, "right"));
    logRow.appendChild(createTableCell(log.short_description));
    logRow.appendChild(createTableCell(log.debug_info || "N/A"));
    logRow.appendChild(createTableCell(log.admin_user_id || "N/A"));
    logRow.appendChild(createTableCell(log.user_id || "N/A"));
    logRow.appendChild(createTableCell(new Date(log.created_at).toLocaleString()));

    elements.logListContainer.appendChild(logRow);
  });
}

function prettifyJSON(jsonData) {
    const cell = createTableCell("");
    cell.innerHTML = `<pre>${JSON.stringify(jsonData, null, 2)}</pre>`;
    return cell;
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

// Handle log filtering
async function handleFilterLogs(event) {
  event.preventDefault();
  const formData = new FormData(elements.filterForm);

  const filterParams = Object.fromEntries(formData);
  state.filterParams = filterParams;

  state.currentPage = 1;
  loadLogs(state.currentPage);
  hideFilterForm();
}
