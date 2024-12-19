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

  const voucherRow = document.createElement('tr');
  voucherRow.classList.add('cart-voucher');
  voucherRow.innerHTML = `
    <td colspan="4" style="vertical-align: middle; text-align: right; font-weight: bold;">
      <div class="d-flex align-items-center justify-content-end">
        <div class="input-group" style="max-width: 350px;">
          <input type="text" id="voucher-input" class="form-control" placeholder="Enter voucher code">
          <button class="btn btn-primary" id="apply-voucher-btn">Apply</button>
          <button class="btn btn-danger remove-voucher id="remove-voucher">Remove</button>
        </div>
      </div>
    </td>
    <td style="vertical-align: middle; text-align: right; font-weight: bold;">$10</td>
   <td>
      <button class="btn btn-secondary" id="browse-vouchers-btn">Browse Vouchers</button>
   </td>

    <div class="modal fade" id="voucher-modal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Available Vouchers</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="voucher-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  fragment.appendChild(voucherRow);

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
  attachVoucherEvents();

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

async function attachVoucherEvents() {
  const applyVoucherBtn = document.getElementById('apply-voucher-btn');
  const browseVouchersBtn = document.getElementById('browse-vouchers-btn');
  const voucherModal = new bootstrap.Modal(document.getElementById('voucher-modal'));
  const voucherInput = document.getElementById('voucher-input');

  applyVoucherBtn.addEventListener('click', async () => {
    const code = voucherInput.value.trim();
    if (code) {
      await applyVoucher(code);
    }
  });

  browseVouchersBtn.addEventListener('click', async () => {
    await loadAvailableVouchers();
    voucherModal.show();
  });

  // Handle remove voucher button if it exists
  const removeVoucherBtn = document.querySelector('.remove-voucher');
  if (removeVoucherBtn) {
    removeVoucherBtn.addEventListener('click', removeVoucher);
  }
}

async function loadAvailableVouchers() {
  try {
    const response = await fetchWithErrorHandling('/crud/vouchers');
    if (response.ok) {
      state.vouchers = await response.data;
      renderVouchersList();
    }
  } catch (error) {
    console.error('Error loading vouchers:', error);
    showToastMessage('Failed to load vouchers', 'error');
  }
}

function renderVouchersList() {
  const voucherList = document.querySelector('.voucher-list');
  voucherList.innerHTML = state.vouchers.map(voucher => `
    <div class="voucher-item card mb-2">
      <div class="card-body">
        <h6 class="card-title">${voucher.name}</h6>
        <p class="card-text">Discount: $${voucher.discount_amount}</p>
        <p class="card-text">Code: ${voucher.code}</p>
        <button class="btn btn-sm btn-primary select-voucher" data-code="${voucher.code}">
          Use this voucher
        </button>
      </div>
    </div>
  `).join('');

  // Add click handlers for voucher selection
  voucherList.querySelectorAll('.select-voucher').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = e.target.dataset.code;
      let voucherInput = document.getElementById('voucher-input');
      voucherInput.value = code;
      let voucherModal = document.getElementById('voucher-modal');
      bootstrap.Modal.getInstance(voucherModal).hide();
    });
  });
}

async function applyVoucher(code) {
  try {
    const response = await fetchWithErrorHandling('/api/cart/apply-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (response.ok) {
      const cartData = await getCartItems();
      state.cart = cartData;
      updateCartDisplay(state);
      showToastMessage('Voucher applied successfully', 'success');
    }
  } catch (error) {
    console.error('Error applying voucher:', error);
    showToastMessage('Failed to apply voucher', 'error');
  }
}

async function removeVoucher() {
  try {
    const response = await fetchWithErrorHandling('/api/cart/remove-voucher', {
      method: 'POST'
    });

    if (response.ok) {
      const cartData = await getCartItems();
      state.cart = cartData;
      updateCartDisplay(state);
      showToastMessage('Voucher removed successfully', 'success');
    }
  } catch (error) {
    console.error('Error removing voucher:', error);
    showToastMessage('Failed to remove voucher', 'error');
  }
}