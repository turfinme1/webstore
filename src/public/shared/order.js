import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

const state = {
  userStatus: null,
};

const elements = {
  orderForm: document.getElementById("order-form"),
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    
  
  state.userStatus = await getUserStatus();
  createNavigation(state.userStatus, document.getElementById("navigation-container"));
  attachLogoutHandler();

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orderId");

  /// get current order
  // async getOrder(req, res) {
  //   ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
  //   const data = {
  //     params: req.params,
  //     session: req.session,
  //     dbConnection: req.dbConnection,
  //   };
  //   const result = await this.orderService.getOrder(data);
  //   res.status(200).json(result);
  // }
  const response = await fetch(`/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.status}`);
  }
  const { order } = await response.json();
  console.log("Order:", order);
  
  renderOrderForm(elements.orderForm);
  attachEventListeners(order);
} catch (error) {
  console.error("Error loading order:", error);
  alert("Failed to load order");
}
});

function attachEventListeners(order) {
  elements.orderForm.addEventListener("submit", handleOrderSubmit);
  paypal.Buttons({
    createOrder: (data, actions) => actions.order.create({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            value: order.total_price,
            currency_code: "USD",
          },
        },
      ],
      application_context: {
        return_url: 'http://localhost:3000/order',
        cancel_url: 'http://localhost:3000/order/cancel-order',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    }),
    onApprove: async (data, actions) => {
      // await actions.order.capture();
      const captureResult = await fetch(`/api/paypal/capture/${order.id}`,{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: data.orderID }),
      });
      
      if (!captureResult.ok) {
        const data = await captureResult.json();
        alert(`Payment failed: ${data.error}`);
        return;
      }

      alert("Payment Successful");
      window.location.href = "/index";
    },
    onError: (err) => console.error("PayPal error:", err)
  }).render("#paypal-button-container");
}

async function initializePayPalButton(order) {
  paypal.Buttons({
    createOrder: (data, actions) => actions.order.create({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            value: order.total_price,
            currency_code: "USD",
          },
        },
      ],
      application_context: {
        return_url: 'http://localhost:3000/order',
        cancel_url: 'http://localhost:3000/order/cancel-order',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    }),
    onApprove: async (data, actions) => {
      alert("Payment Successful");
      window.location.href = "/index";
    },
    onError: (err) => console.error("PayPal error:", err)
  }).render("#paypal-button-container");
}

async function handleOrderSubmit(event) {
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
    const response = await fetch("/api/orders/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    <div id="paypal-button-container" class="mt-4"></div>
    <button type="submit" class="btn btn-primary mt-3">Submit Order</button>
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
