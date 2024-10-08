import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state for the cart
const state = {
  cart_id: null,
  items: [],
  total: 0,
  userStatus: null,
};

// DOM elements
const elements = {
  cartContainer: document.getElementById('cart-container'),
  checkoutButton: document.getElementById('checkout-btn'),
  totalDisplay: document.getElementById('total-display'),
  cartCount: document.getElementById('cart-count'),
};

// Initialize cart page and attach event listeners
document.addEventListener('DOMContentLoaded', async () => {
  state.userStatus = await getUserStatus();
  createNavigation(state.userStatus);
  await attachLogoutHandler();
  const cart = await getCartItems();
  state.items = cart.items;
  state.cart_id = cart.cart_id;
  updateCartDisplay(state);
  attachEventListeners();
});

// Attach event listeners
function attachEventListeners() {
  elements.cartContainer.addEventListener('click', handleCartItemActions);
  elements.checkoutButton.addEventListener('click', handleCheckout);
}

// Handle item actions (update quantity, remove item)
function handleCartItemActions(event) {
  const target = event.target;
  
  if (target.classList.contains('update-quantity')) {
    const itemId = target.dataset.itemId;
    const newQuantity = target.closest('.cart-item').querySelector('.quantity-input').value;
    updateCartItemQuantity(itemId, newQuantity);
  } else if (target.classList.contains('remove-item')) {
    const itemId = target.dataset.itemId;
    removeItemFromCart(itemId);
  }
}

// Update cart item quantity
async function updateCartItemQuantity(productId, newQuantity) {
  try {
    await updateCartItem(productId, newQuantity);
    
    const cart = await getCartItems();
    state.items = cart.items;
    state.cart_id = cart.cart_id;
    updateCartDisplay(state);
  } catch (error) {
    console.error('Error updating cart item:', error);
  }
}

// Remove item from cart
async function removeItemFromCart(itemId) {
  try {
    await removeCartItem(itemId);
    const cart = await getCartItems();
    state.items = cart.items;
    state.cart_id = cart.cart_id;
    updateCartDisplay(state);
  } catch (error) {
    console.error('Error removing cart item:', error);
  }
}

// Handle checkout
async function handleCheckout() {
  try {
    console.log(state.userStatus);
    if (state.userStatus.session_type !== "Authenticated") {
      // If the user is not authenticated, redirect them to login page
      window.location.href = '/login';
      return;
    }

    // Proceed with checkout if authenticated
    const response = await fetch('/api/orders', {
      method: 'POST',
    });

    if (response.ok) {
      window.location.href = '/order'; 
    } else {
      const data = await response.json();
      alert(`Checkout failed: ${data.error}`);
    }
  } catch (error) {
    console.log(error);
    alert(`Checkout failed`);
  }
}

// cartService.js

async function getCartItems() {
  const response = await fetch('/api/cart');
  if (!response.ok) throw new Error('Failed to fetch cart items');
  return await response.json();
}

async function updateCartItem(productId, quantity) {
  const response = await fetch(`/api/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  if (!response.ok) throw new Error('Failed to update cart item');
}

async function removeCartItem(itemId) {
  const response = await fetch(`/api/cart/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove cart item');
}

// cartUI.js
function renderCartItem(item) { 
  const itemRow = document.createElement('tr');
  itemRow.classList.add('cart-item');
  itemRow.innerHTML = `
    <td style="vertical-align: middle;">
      <img src="${item.product_image}" alt="${item.product_name}" class="img-fluid" style="width: 100px; height: auto; margin-right: 10px;" />
      ${item.product_name}
    </td>
    <td style="vertical-align: middle;">${item.product_code}</td>
    <td style="vertical-align: middle;">
      <div class="input-group quantity-group" style="width: 120px;">
        <button class="btn btn-outline-secondary quantity-decrease" id="quantity-decrease-${item.id}" type="button" data-item-id="${item.id}">-</button>
        <input type="number" class="quantity-input form-control text-center" value="${item.quantity}" min="1" style="width: 50px;" readonly />
        <button class="btn btn-outline-secondary quantity-increase" id="quantity-increase-${item.id}" type="button" data-item-id="${item.id}">+</button>
      </div>
    </td>
    <td style="vertical-align: middle; text-align: right">$${item.unit_price}</td>
    <td style="vertical-align: middle; text-align: right">$${item.total_price}</td>
    <td style="vertical-align: middle; text-align: center">
      <button class="remove-item btn btn-sm btn-danger" data-item-id="${item.id}">Remove</button>
    </td>
  `;
  return itemRow;
}

function updateCartDisplay(state) {
  const cartContainer = document.getElementById('cart-container');
  cartContainer.innerHTML = '';

  state.items.forEach((item) => {
    cartContainer.appendChild(renderCartItem(item));
  });

  for (const item of state.items) {
    if (parseInt(item.quantity) === 1) {
      document.getElementById(`quantity-decrease-${item.id}`).disabled = true;
    }
    document.getElementById(`quantity-decrease-${item.id}`).addEventListener('click', () => {
      if (parseInt(item.quantity) > 1) {
      updateCartItemQuantity(item.product_id, parseInt(item.quantity) - 1);
      } 
    });
    document.getElementById(`quantity-increase-${item.id}`).addEventListener('click', () => {
      updateCartItemQuantity(item.product_id, parseInt(item.quantity) + 1);
    });
  }
  const total = state.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
  document.getElementById('cart-total').textContent = total.toFixed(2);
}
