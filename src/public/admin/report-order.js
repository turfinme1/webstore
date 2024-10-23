import { getUserStatus } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  searchParams: {},
  filterParams: {},
  groupParams: [],
  columnsToDisplay: [
    { key: "id", label: "Id" },
    { key: "created_at", label: "Created At" },
    { key: "order_hash", label: "Order Hash" },
    { key: "email", label: "User Email" },
    { key: "status", label: "Status" },
    { key: "total_price", label: "Total Price" },
    { key: "paid_amount", label: "Paid Amount" },
    { key: "is_active", label: "Is Active" },
    { key: "shipping_address", label: "Shipping Address" },
  ],
};

// DOM elements
const elements = {
  orderTableHeader: document.getElementById("order-table-header"),
  orderListContainer: document.getElementById("order-list"),
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
  groupByStatusSelect: document.getElementById("group_by_status"),
  groupByLogLevelSelect: document.getElementById("group_by_log_level"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
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

  const totalPriceMin = parseFloat(formData.get("total_price_min"));
  const totalPriceMax = parseFloat(formData.get("total_price_max"));
  if((totalPriceMin && totalPriceMax) && (totalPriceMin > totalPriceMax)) {
    alert("Total Price Min should be less than Total Price Max");
    return;
  }
  if (totalPriceMin || totalPriceMax) {
    filterParams["total_price"] = {};
    if(totalPriceMin) {
      filterParams["total_price"].min = totalPriceMin;
    }
    if(totalPriceMax) {
      filterParams["total_price"].max = totalPriceMax;
    }
    delete filterParams["total_price_min"];
    delete filterParams["total_price_max"];
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
  const statusCodeGrouping = elements.groupByStatusSelect.value;
  if (statusCodeGrouping) {
    groupParams.push({ column: "status" });
  }


  state.groupParams = groupParams;

  state.currentPage = 1;
  loadLogs(state.currentPage);
  // hideFilterForm();
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

    const response = await fetch(`/crud/orders/filtered?${queryParams.toString()}`);
    const { result, count, groupCount, aggregationResults } = await response.json();

    state.columnsToDisplay = state.columnsToDisplay.filter(col => col.key !== 'count');
    if(state.columnsToDisplay[0].key !== 'id') {
      state.columnsToDisplay.unshift({ key: "id", label: "Id" });
    }
    if (result.length > 0 && result[0].hasOwnProperty('count')) {
      state.columnsToDisplay.push({ key: "count", label: "Count" });
      state.columnsToDisplay = state.columnsToDisplay.filter(col => col.key !== 'id');
    }

    renderLogList(result, aggregationResults);
    updatePagination(count, page);
  } catch (error) {
    console.error("Error loading logs:", error);
  }
}

// Render log list
function renderLogList(logs, aggregationResults) {
  elements.orderListContainer.innerHTML = ""; // Clear previous list
  elements.orderTableHeader.innerHTML = ""; // Clear previous headers

  if (logs.length === 0) {
    elements.orderListContainer.innerHTML = "<tr><td colspan='8'>No logs found.</td></tr>";
    return;
  }

  // Generate table headers based on grouping
  state.columnsToDisplay.forEach(({ label }) => {
    const th = document.createElement("th");
    th.textContent = label;
    elements.orderTableHeader.appendChild(th);
  });

  // Generate table rows
  logs.forEach((log) => {
    const logRow = document.createElement("tr");

    state.columnsToDisplay.forEach(({ key }) => {
      let cellValue = log[key];
      cellValue = cellValue && ["total_price", "paid_amount"].includes(key) ? `$${cellValue}` : cellValue;

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

      if (key === "shipping_address" && cellValue) {
        cellValue = `${cellValue?.country_name}, ${cellValue?.city}, ${cellValue?.street}`;
      }

      // Handle null or undefined values
      if (cellValue === null || cellValue === undefined) {
        cellValue = "---";
      }

      const direction = ["count", "total_price", "paid_amount"].includes(key) ? "right" : "left";
      logRow.appendChild(createTableCell(cellValue, direction));
    });

    elements.orderListContainer.appendChild(logRow);
  });

  // Add group total row
  if(state.groupParams.length > 0) {
    const groupTotalRow = document.createElement("tr");
    state.columnsToDisplay.forEach(({ key }) => {
      let cellValue = "";
      if(key === "created_at") {
        cellValue = "Total:";
      } else if(key === "count") {
        cellValue = aggregationResults.total_group_count_sum;
      } else if(key === "total_price") {
        cellValue = `$${aggregationResults.total_total_price}`;
      } else {
        cellValue = "";
      }

      const direction = ["count", "total_price", "paid_amount"].includes(key) ? "right" : "left";
      groupTotalRow.appendChild(createTableCell(cellValue, direction));
    });

    elements.orderListContainer.appendChild(groupTotalRow);
  }
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
  elements.resultCountDisplay.textContent = `Found ${totalLogs} records`;


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
