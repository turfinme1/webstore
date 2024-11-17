import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

const state = {
  order: null,
  items: null,
};

// Elements
const elements = {
  mainContainer: document.getElementById("main-container"),
  orderDetailsContainer: document.getElementById("order-details-container"),
  orderNumberDisplay: document.getElementById("order-number"),
  orderDateDisplay: document.getElementById("order-date"),
  orderTotalDisplay: document.getElementById("order-total"),
  orderItemsContainer: document.getElementById("order-items-container"),
};

document.addEventListener("DOMContentLoaded", async () => {
  state.userStatus = await getUserStatus();
  createNavigation(
    state.userStatus,
    document.getElementById("navigation-container")
  );
  attachLogoutHandler();

  // Get order ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orderId");

  if (orderId) {
    await fetchOrderDetails(orderId);
  } else {
    alert("Order not found");
  }
});

// Fetch order details
async function fetchOrderDetails(orderId) {
  try {
    const response = await fetch(`/api/orders/${orderId}`);
    if (response.ok) {
      const { order, items } = await response.json();
      state.order = order;
      state.items = items;
      displayOrderDetails();
    } else {
      alert("Error fetching order details");
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
    alert("Error fetching order details");
  }
}

// Display order details
function displayOrderDetails() {
  const h1Status = document.createElement("h1");
  h1Status.textContent = `Order ${state.order.status}`;
  elements.mainContainer.prepend(h1Status);
  elements.orderDateDisplay.textContent = `Order Date: ${new Date(
    state.order.created_at
  ).toLocaleDateString()}`;

  if(state.order.status === 'Cancelled') {
    elements.orderNumberDisplay.textContent = `Order Number: ${state.order.id}`;
  } else if(state.order.status === 'Pending') {
    elements.orderNumberDisplay.textContent = `Order Number: ${state.order.id}`;
    elements.orderTotalDisplay.textContent = `Total: $${state.order.total_price_with_vat}`;
    elements.orderTotalDisplay.textContent = `Check your email for more information.`;
  } else if(state.order.status === 'Paid') {
    elements.orderNumberDisplay.textContent = `Order Number: ${state.order.id}`;
    elements.orderDateDisplay.textContent = `Order Date: ${new Date(
      state.order.created_at
    ).toLocaleDateString()}`;
    // elements.orderTotalDisplay.textContent = `Total: $${state.order.total_price_with_vat}`;
    elements.orderTotalDisplay.textContent = `Check your email for more information.`;
  }
}
