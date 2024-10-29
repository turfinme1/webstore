import { getUserStatus } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  searchParams: {},
  filterParams: {},
  groupParams: [],
  orderParams: [],
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
  showFilterButton: document.getElementById("show-filter-btn"),
  exportCsvButton: document.getElementById("export-csv-btn"),
  exportExcelButton: document.getElementById("export-excel-btn"),
  cancelFilterButton: document.getElementById("cancel-filter-btn"),
  filterContainer: document.getElementById("filter-container"),
  groupByCreatedAtSelect: document.getElementById("group_by_created_at"),
  groupByStatusSelect: document.getElementById("group_by_status"),
  orderBySelect: document.getElementById("order_by"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
  loadOrders(state.currentPage);
});

// Attach event listeners
function attachEventListeners() {
  elements.showFilterButton.addEventListener("click", showFilterForm);
  elements.cancelFilterButton.addEventListener("click", hideFilterForm);
  elements.filterForm.addEventListener("submit", handleFilterOrders);
  elements.exportCsvButton.addEventListener("click", handleExportCsv);
  elements.exportExcelButton.addEventListener("click", handleExportExcel);
}

// Show and hide filter form
function showFilterForm() {
  elements.filterContainer.style.display = "block";
}

function hideFilterForm() {
  elements.filterContainer.style.display = "none";
}

// Handle order filtering and grouping
async function handleFilterOrders(event) {
  event.preventDefault();
  updateAciveFilters();
  loadOrders(state.currentPage);
}

function updateAciveFilters() {
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

  // Order by
  const orderBy = elements.orderBySelect.value;
  if (orderBy) {
    state.orderParams = [ orderBy.split(" ")];
  } else {
    state.orderParams = [];
  }

  state.currentPage = 1;
}

// Fetch and load orders with groupParams included
async function loadOrders(page) {
  try {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      groupParams: JSON.stringify(state.groupParams),
      orderParams: JSON.stringify(state.orderParams),
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

    renderOrderList(result, aggregationResults);
    updatePagination(count, page);
  } catch (error) {
    console.error("Error loading orders:", error);
  }
}

// Render order list
function renderOrderList(orders, aggregationResults) {
  elements.orderListContainer.innerHTML = ""; // Clear previous list
  elements.orderTableHeader.innerHTML = ""; // Clear previous headers

  if (orders.length === 0) {
    elements.orderListContainer.innerHTML = "<tr><td colspan='8'>No orders found.</td></tr>";
    return;
  }

  // Generate table headers based on grouping
  state.columnsToDisplay.forEach(({ label }) => {
    const th = document.createElement("th");
    th.textContent = label;
    elements.orderTableHeader.appendChild(th);
  });

  // Generate table rows
  orders.forEach((order) => {
    const orderRow = document.createElement("tr");

    state.columnsToDisplay.forEach(({ key }) => {
      let cellValue = order[key];
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
      orderRow.appendChild(createTableCell(cellValue, direction));
    });

    elements.orderListContainer.appendChild(orderRow);
  });

  // Add group total row
  if(state.groupParams.length > 0) {
    const groupTotalRow = document.createElement("tr");
    state.columnsToDisplay.forEach(({ key }) => {
      let cellValue = "";
      if(key === "created_at") {
        cellValue = "Total:";
      } else if(key === "count") {
        cellValue = aggregationResults.total_count
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
function updatePagination(totalOrders, page) {
  const totalPages = Math.ceil(totalOrders / state.pageSize);
  elements.paginationContainer.innerHTML = "";

  elements.currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;
  elements.resultCountDisplay.textContent = `Found ${totalOrders} records`;


  if (totalOrders == 0) {
    elements.currentPageDisplay.innerHTML = "";
    elements.resultCountDisplay.textContent = "";
    return;
  }

  elements.paginationContainer.appendChild(
    createPaginationButton("Previous", page > 1, () => loadOrders(page - 1))
  );
  elements.paginationContainer.appendChild(
    createPaginationButton("Next", page < totalPages, () => loadOrders(page + 1))
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

// Export order to CSV
async function handleExportCsv() {
  try {
    updateAciveFilters();
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      groupParams: JSON.stringify(state.groupParams),
    });

    const response = await fetch(`/api/orders/filtered/export/csv?${queryParams.toString()}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.log(error);
    alert("Error exporting orders");
  }
}

// Export order to Excel
async function handleExportExcel() {
  try {
    updateAciveFilters();
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      groupParams: JSON.stringify(state.groupParams),
    });

    const response = await fetch(`/api/orders/filtered/export/excel?${queryParams.toString()}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.xlsx";
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.log(error);
    alert("Error exporting orders");
  }
}