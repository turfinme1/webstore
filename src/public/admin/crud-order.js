import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  filterParams: {},
  countries: [],
  orderToUpdateId: null,
};

// DOM elements
const elements = {
  formContainer: document.getElementById("form-container"),
  filterContainer: document.getElementById("filter-container"),
  orderListContainer: document.getElementById("order-list"),
  paginationContainer: document.getElementById("pagination-container"),
  currentPageDisplay: document.getElementById("current-page-display"),
  resultCountDisplay: document.getElementById("result-count"),
  showFilterButton: document.getElementById("show-filter-btn"),
  cancelFilterButton: document.getElementById("cancel-filter-btn"),
  filterForm: document.getElementById("filter-form"),
  cancelButton: document.getElementById("cancel-btn"),
  showFormButton: document.getElementById("show-form-btn"),
  userSelect: document.getElementById("user_id"),
  countrySelect: document.getElementById("country_id"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
  await loadOrders(state.currentPage);
  await loadUsersSelect();
  await loadCountryCodes();
});

// Attach event listeners
function attachEventListeners() {
  elements.showFilterButton.addEventListener("click", showFilterForm);
  elements.cancelFilterButton.addEventListener("click", hideFilterForm);
  elements.showFormButton.addEventListener("click", showForm);
  elements.cancelButton.addEventListener("click", hideForm);

  elements.filterForm.addEventListener("submit", handleFilterOrders);
}

function hideForm() {
  elements.formContainer.style.display = "none";
}

function showForm() {
  elements.formContainer.style.display = "block";
  elements.filterContainer.style.display = "none";
}

// Show filter form
function showFilterForm() {
  elements.filterContainer.style.display = "block";
  elements.formContainer.style.display = "none";
}

// Hide filter form
function hideFilterForm() {
  elements.filterContainer.style.display = "none";
}

// Handle filter form submission
function handleFilterOrders(event) {
  event.preventDefault();
  const formData = new FormData(elements.filterForm);
  state.filterParams = Object.fromEntries(formData);
  loadOrders(state.currentPage);
}

// Fetch orders and render them in the table
async function loadOrders(page) {
  try {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      pageSize: state.pageSize.toString(),
      page: page.toString(),
    });

    const response = await fetch(`/crud/orders/filtered?${queryParams}`);
    const { result, count } = await response.json();
    renderOrders(result);
    updatePagination(count, page);
  } catch (error) {
    console.error("Error loading orders:", error);
  }
}

// Render orders in the table
function renderOrders(orders) {
  elements.orderListContainer.innerHTML = "";

  orders.forEach((order) => {
    const row = document.createElement("tr");
    row.appendChild(createTableCell(order.id));
    row.appendChild(createTableCell(order.order_hash));
    row.appendChild(createTableCell(order.user_id));
    row.appendChild(createTableCell(order.status));
    row.appendChild(createTableCell(order.total_price));
    row.appendChild(createTableCell(order.paid_amount));
    row.appendChild(createTableCell(order.is_active));
    row.appendChild(
      createTableCell(new Date(order.order_created_at).toLocaleString())
    );
    row.appendChild(
      createTableCell(
        `${order.shipping_address.country_name}, ${order.shipping_address.city}, ${order.shipping_address.street}`
      )
    );

    // Create order items cell with toggle button
    const itemsCell = createTableCell("");

    // Create a div to hold the order items
    const itemsDiv = document.createElement("div");
    itemsDiv.style.display = "none"; // Initially hidden

    // Format the order items in a list
    const itemsList = document.createElement("ul");
    itemsList.classList.add("order-items-list");
    if (order?.order_items) {
      for (const item of order?.order_items) {
        const listItem = document.createElement("li");
        listItem.textContent = `${item.name} - ${item.quantity} item/s`;
        itemsList.appendChild(listItem);
      }
    }

    itemsDiv.appendChild(itemsList);
    const toggleButton = createActionButton("Show Items", "btn-secondary", () =>
      toggleDisplay()
    );

    // Toggle the display of the items when the button is clicked
    function toggleDisplay() {
      if (itemsDiv.style.display === "none") {
        itemsDiv.style.display = "block";
        toggleButton.textContent = "Hide Items";
      } else {
        itemsDiv.style.display = "none";
        toggleButton.textContent = "Show Items";
      }
    }

    // Append the button and items div to the cell
    itemsCell.appendChild(toggleButton);
    itemsCell.appendChild(itemsDiv);
    row.appendChild(itemsCell);

    const actionCell = createTableCell("");
    actionCell.appendChild(
      createActionButton("Update", "btn-warning", () => {})
    );
    actionCell.appendChild(
      createActionButton("Delete", "btn-danger", () => {})
    );
    row.appendChild(actionCell);

    elements.orderListContainer.appendChild(row);
  });
}

function createTableCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function createActionButton(text, btnClass, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.classList.add("btn", btnClass, "me-2");
  button.addEventListener("click", onClick);
  return button;
}

// Update pagination
function updatePagination(totalOrders, page) {
  const totalPages = Math.ceil(totalOrders / state.pageSize);
  elements.paginationContainer.innerHTML = "";
  elements.currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;
  elements.resultCountDisplay.textContent = `Found ${totalOrders} results`;

  if (totalOrders == 0) {
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

//------
async function loadUsersSelect() {
  try {
    const response = await fetch("/crud/users");
    if (!response.ok) {
      throw new Error("Failed to load users");
    }
    const users = await response.json();

    users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.email;
      elements.userSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

async function loadCountryCodes() {
  try {
    const response = await fetch("/crud/iso-country-codes");
    if (!response.ok) throw new Error("Failed to fetch country codes");
    state.countries = await response.json();

    state.countries.forEach((country) => {

      const countryOption = document.createElement("option");
      countryOption.value = country.id;
      countryOption.innerText = `${country.country_name}`;
      elements.countrySelect.appendChild(countryOption);
    //   elements.countryUpdateSelect.appendChild(countryOption.cloneNode(true));
    //   elements.countryFilterSelect.appendChild(countryOption.cloneNode(true));
    });
  } catch (error) {
    console.error("Error fetching country codes:", error);
  }
}
