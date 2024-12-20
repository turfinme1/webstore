import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling, showToastMessage, formatCurrency, getUrlParams, updateUrlParams  } from "./page-utility.js";

// Centralized state object
const state = {
  currentPage: 1,
  pageSize: 10,
  filterParams: {},
  orderParams: [],
  productsInOrder: [],
  countries: [],
  orderToUpdateId: null,
  userStatus: null,
};

// DOM elements
const elements = {
  mainContainer: document.getElementById("main-container"),
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
  spinner: document.getElementById("spinner"),
  createdAtMin: document.getElementById("created_at_min"),
  createdAtMax: document.getElementById("created_at_max"), 
  orderBySelect: document.getElementById("order_by"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  elements.createdAtMin.value = yesterday.toISOString().slice(0, 19);
  elements.createdAtMax.value = new Date().toISOString().slice(0, 19);

  const userStatus = await getUserStatus();
  state.userStatus = userStatus;
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);
  const urlParams = getUrlParams();
  state.currentPage = urlParams.page || 1;
  state.pageSize = urlParams.pageSize || 10;
  state.filterParams = urlParams.filterParams || {};
  state.orderParams = urlParams.orderParams || [];

  if (!hasPermission(userStatus, "read", "orders")) {
    elements.mainContainer.innerHTML = "<h1>User Management</h1>";
    return;
  }
  if (!hasPermission(userStatus, "create", "orders")) {
    elements.showFormButton.style.display = "none";
  }
  attachEventListeners();
  await loadCountryCodes();
  await loadOrders(state.currentPage);
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
  elements.orderBySelect.addEventListener("change", async (e)=> {
    state.currentPage = 1;
    // await loadOrders(state.currentPage);
    handleFilterOrders(e);
  });
}

function hideForm() {
  elements.formContainer.style.display = "none";
}

function showForm() {
  state.productsInOrder = [];
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

  if(elements.orderBySelect.value) {
    state.orderParams = [ elements.orderBySelect.value.split(" ") ];
  } else {
    state.orderParams = [];
  }

  state.filterParams = filterParams;
  loadOrders(state.currentPage);
}

// Fetch orders and render them in the table
async function loadOrders(page) {
  try {
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify(state.filterParams),
      pageSize: state.pageSize.toString(),
      orderParams: JSON.stringify(state.orderParams),
      page: page.toString(),
    });
    console.log(queryParams);
    updateUrlParams(state);

    toggleExportLoadingState();
    const response = await fetchWithErrorHandling(`/crud/orders/filtered?${queryParams}`);
    if(!response.ok) {
      showToastMessage(response.error, "error");
      return;
    }
    const { result, count } = await response.data;
    toggleExportLoadingState(true);
    renderOrders(result);
    updatePagination(count, page);
  } catch (error) {
    toggleExportLoadingState(true);
    console.error("Error loading orders:", error);
  }
}

// Render orders in the table
function renderOrders(orders) {
  elements.orderListContainer.innerHTML = "";
  const totalColumns = 15;

  orders.forEach((order) => {
    const mainRow = document.createElement("tr");
    mainRow.id = `order-row-${order.id}`;
    mainRow.appendChild(
      createTableCell(new Date(order.created_at).toLocaleString())
    );
    mainRow.appendChild(createTableCell(order.id, "right"));
    // row.appendChild(createTableCell(order.order_hash));
    mainRow.appendChild(createTableCell(order.email));
    // row.appendChild(createTableCell(order.user_id));
    mainRow.appendChild(createTableCell(order.status));
    mainRow.appendChild(createTableCell(formatCurrency(order.total_price), "right"));
    mainRow.appendChild(createTableCell(`${order.discount_percentage}%`, "right"));
    mainRow.appendChild(createTableCell(formatCurrency(order.discount_amount), "right"));
    mainRow.appendChild(createTableCell(`${order.vat_percentage}%`, "right"));
    mainRow.appendChild(createTableCell(formatCurrency(order.vat_amount), "right"));
    mainRow.appendChild(createTableCell(formatCurrency(order.total_price_with_vat), "right"));
    mainRow.appendChild(createTableCell(order.voucher_code));
    mainRow.appendChild(createTableCell(formatCurrency(order.voucher_discount_amount), "right"));
    mainRow.appendChild(createTableCell(formatCurrency(order.total_price_with_voucher), "right"));
    mainRow.appendChild(createTableCell(formatCurrency(order.paid_amount), "right"));
    mainRow.appendChild(createTableCell(order.is_active));
    mainRow.appendChild(
      createTableCell(
        `${order.shipping_address.country_name || "--"}, ${order.shipping_address.city|| "--"}, ${order.shipping_address.street|| "--"}`
      )
    );

    // Create order items cell with toggle button
    const itemsCell = createTableCell("");
    const toggleButton = createActionButton("Toggle item list", "btn-secondary", async (e) => {
      e.preventDefault(); // Prevent default button behavior
      const detailsRow = document.getElementById(`order-details-${order.id}`);
      const itemsContainer = detailsRow.querySelector('.items-container');
      
      if (detailsRow.classList.contains('show')) {
        toggleButton.textContent = "Show Items";
        // If open, just hide
        bootstrap.Collapse.getOrCreateInstance(detailsRow).hide();
      } else {
        // If closed, load data first
        toggleButton.disabled = true;
        toggleButton.textContent = "Loading...";
        
        try {
          const response = await fetchWithErrorHandling(`/crud/orders/${order.id}`);
          if (!response.ok) {
            showToastMessage(response.error, "error");
          }
          const orderDetails = await response.data;
          
          if (orderDetails?.order_items?.length > 0) {
            // First clear and append content
            itemsContainer.innerHTML = '';
            itemsContainer.appendChild(createItemsTable(orderDetails.order_items));
            
            // Then initialize collapse and show
            await new Promise(resolve => setTimeout(resolve, 0)); // Let DOM update
            const collapse = bootstrap.Collapse.getOrCreateInstance(detailsRow);
            collapse.show();
            
            toggleButton.textContent = "Toggle item list";
          } else {
            // alert('No items found for this order');
            toggleButton.textContent = "Show Items";
          }
        } catch (error) {
          console.error('Error:', error);
          toggleButton.textContent = "Show Items";
        } finally {
          toggleButton.disabled = false;
        }
      }
    });

    toggleButton.setAttribute('data-bs-toggle', 'collapse');
    toggleButton.setAttribute('data-bs-target', `#order-details-${order.id}`);
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-controls', `order-details-${order.id}`);
    
    itemsCell.appendChild(toggleButton);
    mainRow.appendChild(itemsCell);
    
    // Add main row
    elements.orderListContainer.appendChild(mainRow);
    
    // Create details row
    const detailsRow = document.createElement("tr");
    detailsRow.id = `order-details-${order.id}`;
    detailsRow.classList.add('collapse');
    
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = totalColumns;
    detailsCell.classList.add('p-0');
    
    const itemsContainer = document.createElement("div");
    itemsContainer.classList.add('items-container', 'p-3', 'bg-light');
    
    detailsCell.appendChild(itemsContainer);
    detailsRow.appendChild(detailsCell);

    const actionCell = createTableCell("");
    if (hasPermission(state.userStatus, "update", "orders")) {
      actionCell.appendChild(
        createActionButton("Edit", "btn-warning", () =>
          displayUpdateForm(order.id)
        )
      );
    }

    if (hasPermission(state.userStatus, "delete", "orders")) {
      actionCell.appendChild(
        createActionButton("Delete", "btn-danger", () =>
          handleDeleteOrder(order.id)
        )
      );
    }
    mainRow.appendChild(actionCell);

    elements.orderListContainer.appendChild(detailsRow);
  });
}

function createItemsTable(items) {
  const table = document.createElement('table');
  table.classList.add('table', 'table-sm', 'mb-0');
  
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Product Name</th>
      <th class="text-end">Quantity</th>
      <th class="text-end">Unit Price</th>
      <th class="text-end">Total Price</th>
    </tr>
  `;
  
  const tbody = document.createElement('tbody');
  items.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td class="text-end">${item.quantity}</td>
      <td class="text-end">${formatCurrency(item.unit_price)}</td>
      <td class="text-end">${formatCurrency(item.total_price)}</td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

function createTableCell(text, align = "left") {
  const cell = document.createElement("td");
  cell.style.textAlign = align;
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
    createPaginationButton("Previous", page > 1, () => {
      state.currentPage = page - 1;
      loadOrders(state.currentPage);
    })
  );
  elements.paginationContainer.appendChild(
    createPaginationButton("Next", page < totalPages, () => {
      state.currentPage = page + 1;
      loadOrders(state.currentPage);
    })
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

  if (state.productsInOrder.length === 0) {
    alert("You cannot submit an order without any products.");
    return; // Prevent form submission
  }

  const formData = new FormData(elements.createForm);
  const orderData = Object.fromEntries(formData);
  orderData.order_items = state.productsInOrder;
  orderData.user_id = $("#user_id").val();
  console.log(formData);
  console.log(orderData);

  try {
    const response = await fetchWithErrorHandling("/api-back/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      showToastMessage(response.error, "error");
    } else {
      showToastMessage("Order created successfully", "success");
      elements.createForm.reset();
      state.productsInOrder = [];
      await new Promise((resolve) => setTimeout(resolve, 2000));
      window.location.reload();
      await loadOrders(state.currentPage);
    }
  } catch (error) {
    alert(`Failed to create order: ${error.message}`);
    console.error("Error creating order:", error);
  }
}

/// UPDATE
async function displayUpdateForm(orderId) {
  try {
    const orderResponse = await fetchWithErrorHandling(`/crud/orders/${orderId}`);
    if(!orderResponse.ok) {
      showToastMessage(orderResponse.error, "error");
      return;
    }
    const order = await orderResponse.data;
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
  // elements.updateForm.is_active.value = order.is_active;
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

  if (state.productsInOrder.length === 0) {
    alert("You cannot submit an order without any products.");
    return; // Prevent form submission
  }

  const formData = new FormData(elements.updateForm);
  const orderData = Object.fromEntries(formData);
  orderData.order_items = state.productsInOrder;
  orderData.user_id = $("#user_id_update").val();

  try {
    const response = await fetchWithErrorHandling(`/api-back/orders/${state.orderToUpdateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      showToastMessage(response.error, "error");
    } else {
      showToastMessage("Order updated successfully", "success");
      elements.updateForm.reset();
      state.productsInOrder = [];
      await new Promise((resolve) => setTimeout(resolve, 2000));
      window.location.reload();
      await loadOrders(state.currentPage);
    }
  } catch (error) {
    alert(`Failed to update order: ${error.message}`);
    console.error("Error updating order:", error);
  }
}

/// DELETE
async function handleDeleteOrder(orderId) {
  if (!confirm("Are you sure you want to delete this order?")) return;

  try {
    const response = await fetchWithErrorHandling(`/api-back/orders/${orderId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      showToastMessage(response.error, "error");
    } else {
      showToastMessage("Order deleted successfully", "success");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await loadOrders(state.currentPage);
    }

  } catch (error) {
    console.error("Error deleting order:", error);
    showToastMessage("Failed to delete order", "error");
  }
}

function toggleExportLoadingState(reset = false) {
  if(reset) {
    elements.spinner.style.display = "none";
    return;
  }
  elements.spinner.style.display = elements.spinner.style.display === "none" ? "inline-block" : "none";
}