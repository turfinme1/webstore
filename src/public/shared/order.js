import { createNavigation, getUserStatus, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

const state = {
  userStatus: null,
  paymentOrderId: null,
  cart: null,
  items: [],
};

const elements = {
  orderForm: document.getElementById("order-form"),
  paypalButton: document.getElementById("pay-with-paypal"),
  spinner: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    state.userStatus = await getUserStatus();
    createNavigation(state.userStatus, document.getElementById("navigation-container"));

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("orderId");
    state.paymentOrderId = orderId;

    const cartData = await getCartItems();
    state.items = cartData.items;
    state.cart = cartData;
    updateCartDisplayReadOnly();

    renderOrderForm(elements.orderForm);
    await attachEventListeners();
  } catch (error) {
    console.error("Error loading order:", error);
    showToastMessage("Failed to load order", "error");
  }
});

function togglePayButton() {
  const country = document.getElementById("country").value;
  const street = document.getElementById("street").value;
  const city = document.getElementById("city").value;
  const payButton = document.getElementById("pay-with-paypal");

  const isValid = country && street && city && /^[a-zA-Z0-9 .\\-]+$/.test(street) && /^[a-zA-Z0-9 .\\-]+$/.test(city);
  payButton.disabled = !isValid;
}

async function attachEventListeners() {
  // Attach input event listeners to address fields
  const addressFields = ["country", "street", "city"].map(id => document.getElementById(id));
  addressFields.forEach(field => field.addEventListener("input", togglePayButton));

  // Attach click handler to the Pay with PayPal button
  const payButton = document.getElementById("pay-with-paypal");
  payButton.addEventListener("click", handlePayWithPayPal);

  // Initial toggle for the button
  togglePayButton();
}

async function handlePayWithPayPal(event) {
  event.preventDefault();

  if (state.userStatus.session_type !== "Authenticated") {
    window.location.href = "/login";
    return;
  }

  const addressData = {
    country_id: document.getElementById("country").value,
    street: document.getElementById("street").value,
    city: document.getElementById("city").value,
  };

  try {
    elements.spinner.style.display = "inline-block";
    const response = await fetchWithErrorHandling('/api/orders', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressData }),
    });

   elements.spinner.style.display = "none";
    if (!response.ok) {
      showToastMessage(response.error, "error");
      return;
    }
    const data = await response.data;

    showToastMessage("Order placed successfully. Navigating to Paypal...", "success");
    await new Promise(resolve => setTimeout(resolve, 3000));

    window.location.href = data.approvalUrl;
  } catch (error) {
    elements.spinner.style.display = "none";
    console.error("Error placing order:", error);
    showToastMessage("Failed to place order", "error");
  }
}

function renderOrderForm(container) {
  const formHTML = `
    <h3>Address Information</h3>
    <div>
      <label for="country">Country</label>
      <select id="country" class="form-select" required></select>
    </div>
    <div>
      <label for="street">Street</label>
      <input type="text" id="street" class="form-control" required pattern="^[a-zA-Z0-9 .\\-]+$"/>
    </div>
    <div>
      <label for="city">City</label>
      <input type="text" id="city" class="form-control" required pattern="^[a-zA-Z0-9 .\\-]+$"/>
    </div>

    <div class="d-flex justify-content-start align-items-center mb-3 gap-3 mt-3">
      <button id="pay-with-paypal" class="btn btn-primary" disabled>Pay with PayPal</button>
      <div id="spinner" class="spinner-border text-primary" role="status" style="display: none;">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;

  container.innerHTML = formHTML;
  elements.spinner = document.getElementById("spinner");
  populateCountryDropdown();
}

async function populateCountryDropdown() {
  const countrySelect = document.getElementById("country");
  const countries = await getCountries();

  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.id;
    option.text = country.country_name;
    countrySelect.appendChild(option);
  });
}

async function getCountries() {
  const response = await fetch("/crud/iso-country-codes");
  if (!response.ok) throw new Error("Failed to fetch countries");
  return await response.json();
}

async function getCartItems() {
  const response = await fetch('/api/cart');
  if (!response.ok) throw new Error('Failed to fetch cart items');
  return await response.json();
}

function renderCartItemReadOnly(item) {
  const itemRow = document.createElement('tr');
  itemRow.classList.add('cart-item');
  itemRow.innerHTML = `
    <td style="vertical-align: middle;">
      <img src="${item.product_image}" alt="${item.product_name}" class="img-fluid" style="width: 100px; height: auto; margin-right: 10px;" />
      ${item.product_name}
    </td>
    <td style="vertical-align: middle;">${item.product_code}</td>
    <td style="vertical-align: middle; text-align: center;">${item.quantity}</td>
    <td style="vertical-align: middle; text-align: right;">$${item.unit_price}</td>
    <td style="vertical-align: middle; text-align: right;">$${item.total_price}</td>
  `;
  return itemRow;
}

function renderCartTotalRowReadOnly() {
  const fragment = document.createDocumentFragment();

  const subtotalRow = document.createElement('tr');
  subtotalRow.innerHTML = `
    <td colspan="4" style="text-align: right; font-weight: bold;">Subtotal:</td>
    <td style="text-align: right; font-weight: bold;">$${state.cart.totalPrice}</td>
  `;
  fragment.appendChild(subtotalRow);

  const discountRow = document.createElement('tr');
  discountRow.classList.add('cart-discount');
  discountRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Discount (${state.cart.discountPercentage}%):</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$${state.cart.discountAmount}</td>
  `;
  fragment.appendChild(discountRow);

  const priceAfterDiscountRow = document.createElement('tr');
  priceAfterDiscountRow.classList.add('cart-price-after-discount');
  priceAfterDiscountRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Price after discount:</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$${state.cart.totalPriceAfterDiscount}</td>
  `;
  fragment.appendChild(priceAfterDiscountRow);

  const vatRow = document.createElement('tr');
  vatRow.innerHTML = `
    <td colspan="4" style="text-align: right; font-weight: bold;">VAT (${state.cart.vatPercentage}%):</td>
    <td style="text-align: right; font-weight: bold;">$${state.cart.vatAmount}</td>
  `;
  fragment.appendChild(vatRow);

  const totalRow = document.createElement('tr');
  totalRow.innerHTML = `
    <td colspan="4" style="text-align: right; font-weight: bold;">Total:</td>
    <td style="text-align: right; font-weight: bold;">$${state.cart.totalPriceWithVat}</td>
  `;
  fragment.appendChild(totalRow);

  return fragment;
}

function updateCartDisplayReadOnly() {
  const cartContainer = document.getElementById('cart-container');
  cartContainer.innerHTML = '';

  if (state.items.length === 0) {
    cartContainer.innerHTML = '<tr><td colspan="5" style="text-align: center;">You dont have active order</td></tr>';
    elements.orderForm.style.display = 'none';
    return;
  }

  state.items.forEach((item) => {
    cartContainer.appendChild(renderCartItemReadOnly(item));
  });

  cartContainer.appendChild(renderCartTotalRowReadOnly());
}
