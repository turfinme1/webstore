import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Centralized state for the cart
const state = {
  items: [],
  total: 0,
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
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  state.items = await getCartItems();
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
async function updateCartItemQuantity(itemId, newQuantity) {
  try {
    await updateCartItem(itemId, newQuantity);
    state.items = await getCartItems();
    updateCartDisplay(state);
  } catch (error) {
    console.error('Error updating cart item:', error);
  }
}

// Remove item from cart
async function removeItemFromCart(itemId) {
  try {
    await removeCartItem(itemId);
    state.items = await getCartItems();
    updateCartDisplay(state);
  } catch (error) {
    console.error('Error removing cart item:', error);
  }
}

// Handle checkout
async function handleCheckout() {
  try {
    await checkout();
    alert('Checkout successful!');
    state.items = []; // Empty cart after successful checkout
    updateCartDisplay(state);
  } catch (error) {
    console.error('Error during checkout:', error);
  }
}

// cartService.js

async function getCartItems() {
  const response = await fetch('/api/cart');
  if (!response.ok) throw new Error('Failed to fetch cart items');
  return [{
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  },
  {
    productName: 'Product ' + Math.floor(Math.random() * 100),
    quantity: Math.floor(Math.random() * 10),
    price: Math.floor(Math.random() * 100),
    id: Math.floor(Math.random() * 100),
  }
  ];
  // return await response.json();
}

async function updateCartItem(itemId, quantity) {
  const response = await fetch(`/cart/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!response.ok) throw new Error('Failed to update cart item');
}

async function removeCartItem(itemId) {
  const response = await fetch(`/cart/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove cart item');
}

async function checkout() {
  const response = await fetch('/cart/checkout', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Checkout failed');
}


// cartUI.js

function renderCartItem(item) {
  const itemRow = document.createElement('tr');
  itemRow.classList.add('cart-item');
  itemRow.innerHTML = `
    <td style="vertical-align: middle;">
      <img src="/images/tv.webp" alt="${item.productName}" class="img-fluid" style="width: 100px; height: auto; margin-right: 10px;" />
      ${item.productName}
    </td>
    <td style="vertical-align: middle;">
      <input type="number" class="quantity-input form-control" value="${item.quantity}" style="width: 70px; display: inline-block;" />
      <button class="update-quantity btn btn-sm btn-outline-primary" data-item-id="${item.id}">Update</button>
    </td>
    <td style="vertical-align: middle;">$${item.price.toFixed(2)}</td>
    <td style="vertical-align: middle;">$${(item.price * item.quantity).toFixed(2)}</td>
    <td style="vertical-align: middle;"><button class="remove-item btn btn-sm btn-danger" data-item-id="${item.id}">Remove</button></td>
  `;
  return itemRow;
}

function updateCartDisplay(state) {
  const cartContainer = document.getElementById('cart-container');
  cartContainer.innerHTML = '';
  
  state.items.forEach((item) => {
    cartContainer.appendChild(renderCartItem(item));
  });

  const total = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById('cart-total').textContent = total.toFixed(2);
  // document.getElementById('cart-count').textContent = `Items in Cart: ${state.items.length}`;
}
