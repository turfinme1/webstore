import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  filterParams: {},
  productsInOrder: [],
  countries: [],
  orderToUpdateId: null,
};

// DOM elements
const elements = {
  formContainer: document.getElementById("form-container"),
  createForm: document.getElementById("create-order-form"),
  formUpdateContainer: document.getElementById("form-update-container"),
  updateForm: document.getElementById("update-order-form"),
  filterContainer: document.getElementById("filter-container"),
  orderListContainer: document.getElementById("order-list"),
  paginationContainer: document.getElementById("pagination-container"),
  currentPageDisplay: document.getElementById("current-page-display"),
  resultCountDisplay: document.getElementById("result-count"),
  showFilterButton: document.getElementById("show-filter-btn"),
  cancelFilterButton: document.getElementById("cancel-filter-btn"),
  filterForm: document.getElementById("filter-form"),
  cancelButton: document.getElementById("cancel-btn"),
  cancelUpdateButton: document.getElementById("cancel-update-btn"),
  showFormButton: document.getElementById("show-form-btn"),
  userSelect: document.getElementById("user_id"),
  countrySelect: document.getElementById("country_id"),
  countryUpdateSelect: document.getElementById("country_id_update"),
  addProductBtn: document.getElementById("add-product-btn"),
  addProductUpdateBtn: document.getElementById("add-product-btn_update"),
  productsListContainer: document.getElementById("products-list"),
  productListContainerUpdate: document.getElementById("products-list_update"),
  productSelect: document.getElementById("product-select"),
  productSelectUpdate: document.getElementById("product-select_update"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
  await loadOrders(state.currentPage);
  await loadCountryCodes();
});

$(document).ready(function () {
  $("#product-select").select2({
    placeholder: "Add a product...",
    minimumInputLength: 3, // Start searching after typing at least 3 characters
    language: {
      inputTooShort: function () {
        return "Please enter at least 3 characters to search"; // Custom message
      },
    },
    ajax: {
      url: "/crud/products/filtered", // Endpoint to fetch filtered product list
      dataType: "json",
      delay: 250,
      data: function (params) {
        const filterParams = JSON.stringify({ name: params.term });
        return {
          filterParams: filterParams, // The search term encapsulated in filterParams
          pageSize: 10, // The number of results per page
          page: params.page || 1, // The current page of results
        };
      },
      processResults: function (data, params) {
        params.page = params.page || 1;
        return {
          results: data.result.map(function (product) {
            return { id: product.id, text: product.name };
          }),
          pagination: {
            more: data.count > params.page * 10,
          },
        };
      },
      cache: true,
    },
    theme: "bootstrap-5",
  });
});

$(document).ready(function () {
  $("#product-select_update").select2({
    placeholder: "Add a product...",
    minimumInputLength: 3, // Start searching after typing at least 3 characters
    language: {
      inputTooShort: function () {
        return "Please enter at least 3 characters to search"; // Custom message
      },
    },
    ajax: {
      url: "/crud/products/filtered", // Endpoint to fetch filtered product list
      dataType: "json",
      delay: 250,
      data: function (params) {
        const filterParams = JSON.stringify({ name: params.term });
        return {
          filterParams: filterParams, // The search term encapsulated in filterParams
          pageSize: 10, // The number of results per page
          page: params.page || 1, // The current page of results
        };
      },
      processResults: function (data, params) {
        params.page = params.page || 1;
        return {
          results: data.result.map(function (product) {
            return { id: product.id, text: product.name };
          }),
          pagination: {
            more: data.count > params.page * 10,
          },
        };
      },
      cache: true,
    },
    theme: "bootstrap-5",
  });
});

$(document).ready(function () {
  $("#user_id").select2({
    placeholder: "Select an user...",
    minimumInputLength: 3, // Start searching after typing at least 3 characters
    language: {
      inputTooShort: function () {
        return "Please enter at least 3 characters to search"; // Custom message
      },
    },
    ajax: {
      url: "/crud/users/filtered", // Endpoint to fetch filtered product list
      dataType: "json",
      delay: 250,
      data: function (params) {
        const filterParams = JSON.stringify({ email: params.term });
        return {
          filterParams: filterParams, // The search term encapsulated in filterParams
          pageSize: 10, // The number of results per page
          page: params.page || 1, // The current page of results
        };
      },
      processResults: function (data, params) {
        params.page = params.page || 1;
        return {
          results: data.result.map(function (user) {
            return { id: user.id, text: user.email };
          }),
          pagination: {
            more: data.count > params.page * 10,
          },
        };
      },
      cache: true,
    },
    theme: "bootstrap-5",
  });
});

$(document).ready(function () {
  $("#user_id_update").select2({
    placeholder: "Select an user...",
    minimumInputLength: 3, // Start searching after typing at least 3 characters
    language: {
      inputTooShort: function () {
        return "Please enter at least 3 characters to search"; // Custom message
      },
    },
    ajax: {
      url: "/crud/users/filtered", // Endpoint to fetch filtered product list
      dataType: "json",
      delay: 250,
      data: function (params) {
        const filterParams = JSON.stringify({ email: params.term });
        return {
          filterParams: filterParams, // The search term encapsulated in filterParams
          pageSize: 10, // The number of results per page
          page: params.page || 1, // The current page of results
        };
      },
      processResults: function (data, params) {
        params.page = params.page || 1;
        return {
          results: data.result.map(function (user) {
            return { id: user.id, text: user.email };
          }),
          pagination: {
            more: data.count > params.page * 10,
          },
        };
      },
      cache: true,
    },
    theme: "bootstrap-5",
  });
});

// Attach event listeners
function attachEventListeners() {
  elements.showFilterButton.addEventListener("click", showFilterForm);
  elements.cancelFilterButton.addEventListener("click", hideFilterForm);
  elements.showFormButton.addEventListener("click", showForm);
  elements.cancelButton.addEventListener("click", hideForm);
  elements.cancelUpdateButton.addEventListener("click", hideUpdateForm);
  elements.addProductBtn.addEventListener("click", handleAddProduct);
  elements.addProductUpdateBtn.addEventListener("click", handleAddProductUpdate);

  elements.filterForm.addEventListener("submit", handleFilterOrders);
  elements.createForm.addEventListener("submit", handleCreateOrder);
  elements.updateForm.addEventListener("submit", handleUpdateOrder);
}

function hideForm() {
  elements.formContainer.style.display = "none";
}

function showForm() {
  elements.formContainer.style.display = "block";
  elements.filterContainer.style.display = "none";
  elements.formUpdateContainer.style.display = "none";
}

function showUpdateForm() {
  elements.formUpdateContainer.style.display = "block";
  elements.filterContainer.style.display = "none";
  elements.formContainer.style.display = "none";
}

function hideUpdateForm() {
  elements.formUpdateContainer.style.display = "none";
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
      createActionButton("Update", "btn-warning", () =>
        displayUpdateForm(order.id)
      )
    );
    actionCell.appendChild(
      createActionButton("Delete", "btn-danger", () =>
        handleDeleteOrder(order.id)
      )
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

// LOAD SELECTS
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
      elements.countryUpdateSelect.appendChild(countryOption.cloneNode(true));
      //   elements.countryFilterSelect.appendChild(countryOption.cloneNode(true));
    });
  } catch (error) {
    console.error("Error fetching country codes:", error);
  }
}

/// CREATE
function handleAddProduct() {
  const productId = elements.productSelect.value;
  const productName =
    elements.productSelect.options[elements.productSelect.selectedIndex].text;
  $("#product-select").val(null).trigger("change");

  // Check if product already exists in the state
  const existingProduct = state.productsInOrder.find((p) => p.id === productId);
  if (existingProduct) {
    existingProduct.quantity++; // Update quantity if product exists
  } else if (productId) {
    state.productsInOrder.push({
      id: productId,
      name: productName,
      quantity: 1,
    });
  }

  elements.productSelect.value = ""; // Reset select field
  renderSelectedProducts(); // Update the product list UI
}

function renderSelectedProducts() {
  elements.productsListContainer.innerHTML = ""; // Clear current list

  state.productsInOrder.forEach((product, index) => {
    const productRow = document.createElement("div");
    productRow.classList.add("d-flex", "align-items-center", "mb-2");

    // Left: Product Name
    const productName = document.createElement("span");
    productName.textContent = product.name;
    productName.classList.add("me-2");
    productName.style.width = "40%";

    // Middle: Quantity Input (Disabled for direct input)
    const productQuantity = document.createElement("input");
    productQuantity.type = "number";
    productQuantity.value = product.quantity;
    productQuantity.classList.add("form-control", "product-quantity", "me-2");
    productQuantity.style.width = "15%";
    productQuantity.readOnly = true;

    // Increase Button
    const increaseBtn = document.createElement("button");
    increaseBtn.textContent = "+";
    increaseBtn.classList.add("btn", "btn-secondary", "me-1");
    increaseBtn.addEventListener("click", () =>
      modifyProductQuantity(index, 1, renderSelectedProducts)
    );

    // Decrease Button
    const decreaseBtn = document.createElement("button");
    decreaseBtn.textContent = "-";
    decreaseBtn.classList.add("btn", "btn-secondary", "me-1");
    decreaseBtn.addEventListener("click", () =>
      modifyProductQuantity(index, -1, renderSelectedProducts)
    );

    // Right: Remove Button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.classList.add("btn", "btn-danger", "ms-2");
    removeBtn.addEventListener("click", () => handleRemoveProduct(index, renderSelectedProducts));

    // Append elements to the product row
    productRow.appendChild(productName);
    productRow.appendChild(decreaseBtn);
    productRow.appendChild(productQuantity);
    productRow.appendChild(increaseBtn);
    productRow.appendChild(removeBtn);

    // Add the product row to the products list container
    elements.productsListContainer.appendChild(productRow);
  });
}

function modifyProductQuantity(productIndex, change, renderSelectedProducts) {
  const product = state.productsInOrder[productIndex];
  product.quantity += change;

  if (product.quantity < 1) {
    product.quantity = 1; // Prevent quantity from going below 1
  }

  renderSelectedProducts(); // Re-render UI after quantity change
}

function handleRemoveProduct(productIndex, renderSelectedProducts) {
  state.productsInOrder.splice(productIndex, 1); // Remove product from the state
  renderSelectedProducts(); // Update the UI
}

async function handleCreateOrder(event) {
  event.preventDefault();
  const formData = new FormData(elements.createForm);
  const orderData = Object.fromEntries(formData);
  orderData.order_items = state.productsInOrder;
  orderData.user_id = $("#user_id").val();
  console.log(formData);
  console.log(orderData);

  try {
    const response = await fetch("/api-back/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(errorMessage);
    }

    alert("Order created successfully");
    elements.createForm.reset();
    state.productsInOrder = [];
    window.location.reload();
    await loadOrders(state.currentPage);
  } catch (error) {
    alert(`Failed to create order: ${error.message}`);
    console.error("Error creating order:", error);
  }
}

/// UPDATE
async function displayUpdateForm(orderId) {
  try {
    const orderResponse = await fetch(`/crud/orders/${orderId}`);
    const order = await orderResponse.json();
    console.log(order);
    state.orderToUpdateId = orderId;
    state.productsInOrder = order.order_items;
    showUpdateForm();
    populateUpdateForm(order);
    renderSelectedProductsUpdate();
  } catch (error) {
    console.error("Error loading user for update:", error);
  }
}

function populateUpdateForm(order) {
  // Populate the form with the order data
  // elements.updateForm.user_id_update.value = order.user_id;
  const option = new Option(order.email, order.user_id, true, true);
  $("#user_id_update").append(option).trigger("change");
  // $("#user_id_update").val(order.user_id).trigger("change");
  elements.updateForm.order_status.value = order.status;
  // elements.updateForm.total_price.value = order.total_price;
  // elements.updateForm.paid_amount.value = order.paid_amount;
  elements.updateForm.is_active.value = order.is_active;
  elements.updateForm.street.value = order.shipping_address.street;
  elements.updateForm.city.value = order.shipping_address.city;
  elements.updateForm.country_id_update.value = order.shipping_address.country_id;
}

function renderSelectedProductsUpdate() {
  elements.productListContainerUpdate.innerHTML = ""; // Clear current list

  state.productsInOrder.forEach((product, index) => {
    const productRow = document.createElement("div");
    productRow.classList.add("d-flex", "align-items-center", "mb-2");

    // Left: Product Name
    const productName = document.createElement("span");
    productName.textContent = product.name;
    productName.classList.add("me-2");
    productName.style.width = "40%";

    // Middle: Quantity Input (Disabled for direct input)
    const productQuantity = document.createElement("input");
    productQuantity.type = "number";
    productQuantity.value = product.quantity;
    productQuantity.classList.add("form-control", "product-quantity", "me-2");
    productQuantity.style.width = "15%";
    productQuantity.readOnly = true;

    // Increase Button
    const increaseBtn = document.createElement("button");
    increaseBtn.textContent = "+";
    increaseBtn.classList.add("btn", "btn-secondary", "me-1");
    increaseBtn.addEventListener("click", () =>
      modifyProductQuantity(index, 1, renderSelectedProductsUpdate)
    );

    // Decrease Button
    const decreaseBtn = document.createElement("button");
    decreaseBtn.textContent = "-";
    decreaseBtn.classList.add("btn", "btn-secondary", "me-1");
    decreaseBtn.addEventListener("click", () =>
      modifyProductQuantity(index, -1, renderSelectedProductsUpdate)
    );

    // Right: Remove Button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.classList.add("btn", "btn-danger", "ms-2");
    removeBtn.addEventListener("click", () => handleRemoveProduct(index, renderSelectedProductsUpdate));

    // Append elements to the product row
    productRow.appendChild(productName);
    productRow.appendChild(decreaseBtn);
    productRow.appendChild(productQuantity);
    productRow.appendChild(increaseBtn);
    productRow.appendChild(removeBtn);

    // Add the product row to the products list container
    elements.productListContainerUpdate.appendChild(productRow);
  });
}

function handleAddProductUpdate() {
  const productId = elements.productSelectUpdate.value;
  const productName =
    elements.productSelectUpdate.options[elements.productSelect.selectedIndex].text;
  $("#product-select_update").val(null).trigger("change");

  // Check if product already exists in the state
  const existingProduct = state.productsInOrder.find((p) => p.id === productId);
  if (existingProduct) {
    existingProduct.quantity++; // Update quantity if product exists
  } else if (productId) {
    state.productsInOrder.push({
      id: productId,
      name: productName,
      quantity: 1,
    });
  }

  elements.productSelectUpdate.value = ""; // Reset select field
  renderSelectedProductsUpdate(); // Update the product list UI
}

async function handleUpdateOrder(event) {
  event.preventDefault();
  const formData = new FormData(elements.updateForm);
  const orderData = Object.fromEntries(formData);
  orderData.order_items = state.productsInOrder;
  orderData.user_id = $("#user_id_update").val();

  try {
    const response = await fetch(`/api-back/orders/${state.orderToUpdateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorMessage = await response.json();
      throw new Error(errorMessage.error);
    }

    alert("Order updated successfully");
    elements.updateForm.reset();
    state.productsInOrder = [];
    window.location.reload();
    await loadOrders(state.currentPage);
  } catch (error) {
    alert(`Failed to update order: ${error.message}`);
    console.error("Error updating order:", error);
  }
}

/// DELETE
async function handleDeleteOrder(orderId) {
  if (!confirm("Are you sure you want to delete this order?")) return;

  try {
    const response = await fetch(`/api-back/orders/${orderId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(errorMessage.error);
    }

    alert("Order deleted successfully");
    await loadOrders(state.currentPage);
  } catch (error) {
    alert(`Failed to delete order: ${error.message}`);
    console.error("Error deleting order:", error);
  }
}