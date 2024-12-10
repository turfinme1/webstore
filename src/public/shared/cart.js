import { createNavigation, getUserStatus, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

// Centralized state for the cart
const state = {
  userStatus: null,
  cart: null,
  items: [],
};

// DOM elements
const elements = {
  cartContainer: document.getElementById('cart-container'),
  checkoutButton: document.getElementById('checkout-btn'),
  cartCount: document.getElementById('cart-count'),
};

// Initialize cart page and attach event listeners
document.addEventListener('DOMContentLoaded', async () => {
  state.userStatus = await getUserStatus();
  createNavigation(state.userStatus);
  const cartData = await getCartItems();
  state.items = cartData.items;
  state.cart = cartData;
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
    const response = await fetchWithErrorHandling(`/api/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_id: productId, quantity: newQuantity }),
    });
    if (!response.ok) {
      showToastMessage(response.error, "error");
    } else {
      const cartData = await getCartItems();
      state.items = cartData.items;
      state.cart = cartData;
      
      updateCartDisplay(state);
    }
  } catch (error) {
    console.error('Error updating cart item:', error);
  }
}

// Remove item from cart
async function removeItemFromCart(itemId) {
  try {
    const response = await fetchWithErrorHandling(`/api/cart/${itemId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      showToastMessage(response.error, "error");
    } else {
      const cartData = await getCartItems();
      state.items = cartData.items;
      state.cart = cartData;
      
      updateCartDisplay(state);
    }
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

    window.location.href = '/order';

  } catch (error) {
    console.log(error);
    alert(`Checkout failed`);
  }
}

// cartService.js

async function getCartItems() {
  const response = await fetchWithErrorHandling('/api/cart');
  if (!response.ok) {
    showToastMessage(response.error, "error");
  } else {
    return await response.data;
  }
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
      <div class="input-group quantity-group">
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

function renderCartTotalRow() {
  const fragment = document.createDocumentFragment();

  const subtotalRow = document.createElement('tr');
  subtotalRow.classList.add('cart-subtotal');
  subtotalRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Subtotal:</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$${state.cart.totalPrice}</td>
    <td></td>
  `;
  fragment.appendChild(subtotalRow);

  const discountRow = document.createElement('tr');
  discountRow.classList.add('cart-discount');
  discountRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Discount (${state.cart.discountPercentage}%):</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$${state.cart.discountAmount}</td>
    <td></td>
  `;
  fragment.appendChild(discountRow);

  const priceAfterDiscountRow = document.createElement('tr');
  priceAfterDiscountRow.classList.add('cart-price-after-discount');
  priceAfterDiscountRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Price after discount:</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$${state.cart.totalPriceAfterDiscount}</td>
    <td></td>
  `;
  fragment.appendChild(priceAfterDiscountRow);

  const vatRow = document.createElement('tr');
  vatRow.classList.add('cart-vat');
  vatRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">VAT (${state.cart.vatPercentage}%):</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$${state.cart.vatAmount}</td>
    <td></td>
  `;
  fragment.appendChild(vatRow);

  const totalRow = document.createElement('tr');
  totalRow.classList.add('cart-total');
  totalRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">Total:</td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$${state.cart.totalPriceWithVat}</td>
    <td></td>
  `;
  fragment.appendChild(totalRow);

  return fragment;
}


function updateCartDisplay(state) {
  const cartContainer = document.getElementById('cart-container');
  cartContainer.innerHTML = '';

  state.items.forEach((item) => {
    cartContainer.appendChild(renderCartItem(item));
  });

  if (state.items.length === 0) {
    cartContainer.innerHTML = '<tr><td colspan="6" style="text-align: center;">Your cart is empty.</td></tr>';
    elements.checkoutButton.disabled = true;
    return;
  }
  elements.checkoutButton.disabled = false;
  cartContainer.appendChild(renderCartTotalRow());

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
}
