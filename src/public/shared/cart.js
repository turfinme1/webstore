import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state object
const state = {
  cartItems: [],
};

// DOM elements
const elements = {
  cartItemsContainer: document.getElementById("cart-items-container"),
  totalAmountDisplay: document.getElementById("total-amount"),
  checkoutButton: document.getElementById("checkout-btn"),
  clearCartButton: document.getElementById("clear-cart-btn"),
};

// Initialize page and attach event listeners
document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  attachEventListeners();
  loadCartItems();
});

// Attach event listeners
function attachEventListeners() {
  elements.checkoutButton.addEventListener("click", handleCheckout);
//   elements.clearCartButton.addEventListener("click", handleClearCart);
}

// Load cart items from local storage or cookie
function loadCartItems() {
  const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
  state.cartItems = storedCart;
  renderCartItems(storedCart);
  updateTotalAmount(calculateTotalAmount(storedCart));
}

// Render cart items
function renderCartItems(items) {
  elements.cartItemsContainer.innerHTML = ""; // Clear previous list
  items.forEach((item) => {
    const cartRow = document.createElement("tr");

    // Create cells for cart item details
    cartRow.appendChild(createTableCell(item.product_name));
    cartRow.appendChild(createTableCell(item.price));
    cartRow.appendChild(createQuantityInput(item));
    cartRow.appendChild(createTableCell(item.subtotal));

    // Actions (Remove)
    const actionCell = createTableCell("");
    actionCell.appendChild(
      createActionButton("Remove", "btn-danger", () =>
        handleRemoveCartItem(item.id)
      )
    );
    cartRow.appendChild(actionCell);

    elements.cartItemsContainer.appendChild(cartRow);
  });
}

// Create table cell
function createTableCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

// Create quantity input with change event
function createQuantityInput(item) {
  const inputCell = document.createElement("td");
  const quantityInput = document.createElement("input");
  quantityInput.type = "number";
  quantityInput.value = item.quantity;
  quantityInput.min = 1;
  quantityInput.addEventListener("change", () =>
    handleUpdateQuantity(item.id, quantityInput.value)
  );

  inputCell.appendChild(quantityInput);
  return inputCell;
}

// Update cart item quantity
function handleUpdateQuantity(itemId, newQuantity) {
  const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
  const itemIndex = cartItems.findIndex(item => item.id === itemId);
  
  if (itemIndex !== -1) {
    cartItems[itemIndex].quantity = newQuantity;
    cartItems[itemIndex].subtotal = (cartItems[itemIndex].price * newQuantity).toFixed(2);
    localStorage.setItem("cart", JSON.stringify(cartItems));
    loadCartItems(); // Refresh the cart items
  }
}

// Handle cart item removal
function handleRemoveCartItem(itemId) {
  const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
  const updatedCartItems = cartItems.filter(item => item.id !== itemId);
  
  localStorage.setItem("cart", JSON.stringify(updatedCartItems));
  loadCartItems(); // Refresh the cart items
}

// Calculate total amount
function calculateTotalAmount(items) {
  return items.reduce((total, item) => total + parseFloat(item.subtotal), 0).toFixed(2);
}

// Update total amount display
function updateTotalAmount(totalAmount) {
  elements.totalAmountDisplay.textContent = `Total: $${totalAmount}`;
}

// Handle checkout
function handleCheckout() {
  alert("Proceeding to checkout...");
  // Logic for proceeding to checkout can be added here
}

// Handle clearing the cart
function handleClearCart() {
  if (confirm("Are you sure you want to clear the cart?")) {
    localStorage.removeItem("cart");
    loadCartItems(); // Refresh the cart items
  }
}

// Create action button
function createActionButton(text, className, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.classList.add("btn", className);
  button.addEventListener("click", onClick);
  return button;
}
