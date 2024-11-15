import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

const state = {
  userStatus: null,
  paymentOrderId: null,
};

const elements = {
  orderForm: document.getElementById("order-form"),
  paypalButton: document.getElementById("pay-with-paypal"),
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    state.userStatus = await getUserStatus();
    createNavigation(state.userStatus, document.getElementById("navigation-container"));
    attachLogoutHandler();

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("orderId");
    state.paymentOrderId = orderId;
    
    renderOrderForm(elements.orderForm);
    await attachEventListeners();
  } catch (error) {
    console.error("Error loading order:", error);
    alert("Failed to load order");
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
    const response = await fetch("/api/orders/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressData }),
    });

    if (response.ok) {
      alert("Navigating to PayPal for payment...");
      
    } else {
      const data = await response.json();
      alert(`Order failed: ${data.error}`);
      return;
    }

    const paypalPaymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${state.paymentOrderId}`;
    window.location.href = paypalPaymentUrl;
  } catch (error) {
    console.error("Error placing order:", error);
    alert("Order failed.");
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

    <button id="pay-with-paypal" class="btn btn-primary mt-4" disabled>Pay with PayPal</button>
  `;

  container.innerHTML = formHTML;
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
