import { initTheme, getCart, saveCart, formatCurrency, showToast } from './utils.js';

let cart = [];
let deliveryFee = 50;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    cart = getCart();
    
    document.getElementById('delivery-method').addEventListener('change', (e) => {
        deliveryFee = parseInt(e.target.value);
        updateSummary();
    });

    document.getElementById('checkout-btn').addEventListener('click', () => {
        if(cart.length === 0) {
            showToast('Cart is empty', 'error');
            return;
        }
        // Save delivery choice
        localStorage.setItem('deliveryFee', deliveryFee);
        window.location.href = 'checkout.html';
    });

    renderCart();
});

function renderCart() {
    const container = document.getElementById('cart-items-container');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; background: var(--surface-color); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                <div style="font-size: 4rem; margin-bottom: 24px;">🛒</div>
                <h2>Your cart is empty</h2>
                <p style="color: var(--text-secondary); margin: 16px 0 32px;">Looks like you haven't added any premium dairy yet.</p>
                <a href="products.html" class="btn-primary">Start Shopping</a>
            </div>
        `;
        document.getElementById('checkout-btn').disabled = true;
    } else {
        document.getElementById('checkout-btn').disabled = false;
        container.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-img-box">
                    <img src="${item.image || 'https://via.placeholder.com/100'}" alt="${item.name}">
                </div>
                <div class="cart-details">
                    <div style="display: flex; justify-content: space-between;">
                        <h3 style="font-size: 1.25rem; margin-bottom: 4px;">${item.name}</h3>
                        <div style="font-weight: 700; color: var(--brand-color); font-size: 1.2rem;">${formatCurrency(item.price * item.quantity)}</div>
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.95rem;">Weight: ${item.weight}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                            <input type="text" class="qty-input" value="${item.quantity}" readonly>
                            <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                        </div>
                        <button class="btn-outline" style="padding: 6px 12px; font-size: 0.85rem; border-color: var(--error-color); color: var(--error-color);" onclick="removeItem(${index})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    updateSummary();
}

window.updateQty = (index, delta) => {
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) {
        cart.splice(index, 1);
        showToast('Item removed from cart');
    }
    saveCart(cart);
    renderCart();
};

window.removeItem = (index) => {
    cart.splice(index, 1);
    saveCart(cart);
    showToast('Item removed from cart');
    renderCart();
};

function updateSummary() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const itemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    
    document.getElementById('summary-items').innerText = itemsCount;
    document.getElementById('summary-subtotal').innerText = formatCurrency(subtotal);
    
    const total = subtotal > 0 ? subtotal + deliveryFee : 0;
    document.getElementById('summary-total').innerText = formatCurrency(total);
}
