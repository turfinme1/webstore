import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state for the order page
const state = {
  userStatus: null,
};

// DOM elements
const elements = {
  orderForm: document.getElementById("order-form"),
  submitOrderButton: document.getElementById("submit-order-btn"),
};

// Initialize order page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  state.userStatus = await getUserStatus();
  createNavigation(state.userStatus);
  await attachLogoutHandler();

  renderOrderForm(elements.orderForm);
  attachEventListeners();
});

// Attach event listeners
function attachEventListeners() {
  elements.orderForm.addEventListener("submit", handleOrderSubmit);
}

// Handle order submission
async function handleOrderSubmit(event) {
  event.preventDefault();

  if (state.userStatus.session_type !== "Authenticated") {
    window.location.href = "/login";
    return;
  }

  // Gather address and payment details from the form
  const addressData = {
    country_id: document.getElementById("country").value,
    street: document.getElementById("street").value,
    city: document.getElementById("city").value,
  };

  // const paymentData = {
  //   card_number: document.getElementById("card-number").value,
  //   expiry_date: document.getElementById("expiry-date").value,
  //   cvv: document.getElementById("cvv").value,
  // };

  // Proceed with submitting the order
  try {
    const response = await fetch("/api/orders/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: addressData }),
    });

    if (response.ok) {
      alert("Order placed successfully!");
      window.location.href = "/index";
    } else {
      const data = await response.json();
      alert(`Order failed: ${data.error}`);
    }
  } catch (error) {
    console.error("Error placing order:", error);
    alert("Order failed.");
  }
}

// Renders the combined address and payment form
function renderOrderForm(container) {
  const formHTML = `
    <h3>Address Information</h3>
    <div>
      <label for="country">Country</label>
      <select id="country" class="form-select" required></select>
    </div>
    <div>
      <label for="street">Street</label>
      <input type="text" id="street" class="form-control" required />
    </div>
    <div>
      <label for="city">City</label>
      <input type="text" id="city" class="form-control" required />
    </div>

    <button type="submit" class="btn btn-primary mt-3">Submit Order</button>
  `;

  container.innerHTML = formHTML;
  populateCountryDropdown();
}

// Populate the country dropdown with data from the server
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

// Fetch countries from the server
async function getCountries() {
  const response = await fetch("/crud/iso-country-codes");
  if (!response.ok) throw new Error("Failed to fetch countries");
  return await response.json();
}
