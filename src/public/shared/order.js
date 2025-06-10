import { createNavigation, getUserStatus, fetchWithErrorHandling, showErrorMessage, showMessage, formatCurrency, initializePage } from "./page-utility.js";

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
    await initializePage();
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
    showErrorMessage("Failed to load order");
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

  const payButton = document.getElementById("pay-with-paypal");
  try {
    payButton.disabled = true;
    elements.spinner.style.display = "inline-block";
    const response = await fetchWithErrorHandling('/api/orders', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressData }),
    });

   elements.spinner.style.display = "none";
    if (!response.ok) {
      payButton.disabled = false;
      return;
    }
    const data = await response.data;

    if(state.cart.total_price_with_voucher == 0){
      showMessage("Order placed successfully. Navigating to order complete page...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      window.location.href = `/order-complete?orderId=${data.orderId}`;
      return;
    }
    showMessage("Order placed successfully. Navigating to Paypal...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    window.location.href = data.approvalUrl;
  } catch (error) {
    payButton.disabled = false;
    elements.spinner.style.display = "none";
    console.error("Error placing order:", error);
    showErrorMessage("Failed to place order");
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
      <button id="pay-with-paypal" class="btn btn-primary" disabled>${state.cart.total_price_with_voucher == 0 ? "Complete order": "Pay with PayPal"}</button>
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
  const response = await fetchWithErrorHandling("/crud/iso-country-codes");
  if (!response.ok) throw new Error("Failed to fetch countries");
  return response.data;
}

async function getCartItems() {
  const response = await fetchWithErrorHandling('/api/cart');
  if (!response.ok) throw new Error('Failed to fetch cart items');
  return response.data;
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
    <td style="vertical-align: middle; text-align: right;">${formatCurrency(item.unit_price)}</td>
    <td style="vertical-align: middle; text-align: right;">${formatCurrency(item.total_price)}</td>
  `;
  return itemRow;
}

function renderCartTotalRowReadOnly() {
  const fragment = document.createDocumentFragment();

  const subtotalRow = document.createElement('tr');
  subtotalRow.innerHTML = `
    <td colspan="4" style="text-align: right; font-weight: bold;">Subtotal:</td>
    <td style="text-align: right; font-weight: bold;">${formatCurrency(state.cart.total_price)}</td>
  `;
  fragment.appendChild(subtotalRow);

  const discountRow = document.createElement('tr');
  discountRow.classList.add('cart-discount');
  discountRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Discount (${state.cart.discount_percentage}%):</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">${formatCurrency(state.cart.discount_amount)}</td>
  `;
  fragment.appendChild(discountRow);

  const priceAfterDiscountRow = document.createElement('tr');
  priceAfterDiscountRow.classList.add('cart-price-after-discount');
  priceAfterDiscountRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Price after discount:</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">${formatCurrency(state.cart.total_price_after_discount)}</td>
  `;
  fragment.appendChild(priceAfterDiscountRow);

  const vatRow = document.createElement('tr');
  vatRow.innerHTML = `
    <td colspan="4" style="text-align: right; font-weight: bold;">VAT (${state.cart.vat_percentage}%):</td>
    <td style="text-align: right; font-weight: bold;">${formatCurrency(state.cart.vat_amount)}</td>
  `;
  fragment.appendChild(vatRow);

  const priceWithVatRow = document.createElement('tr');
  priceWithVatRow.classList.add('cart-price-with-vat');
  priceWithVatRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Total price with VAT:</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">${formatCurrency(state.cart.total_price_with_vat)}</td>
    <td></td>
  `;
  fragment.appendChild(priceWithVatRow);

  const voucherRow = document.createElement('tr');
  voucherRow.classList.add('cart-voucher');
  voucherRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Voucher (${state.cart.voucher_code || "Not applied"}):</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">-${formatCurrency(state.cart.voucher_amount)}</td>
    <td></td>
  `;
  fragment.appendChild(voucherRow);

  const totalRow = document.createElement('tr');
  totalRow.classList.add('cart-total');
  totalRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Total:</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">${formatCurrency(state.cart.total_price_with_voucher)}</td>
    <td></td>
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
