import { db } from './firebase-config.js';
import { collection, doc, runTransaction, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initTheme, getCart, saveCart, formatCurrency, showToast } from './utils.js';

let cart = [];
let deliveryFee = 0;
let totalAmount = 0;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    cart = getCart();
    deliveryFee = parseInt(localStorage.getItem('deliveryFee') || '50');

    if(cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }



    renderSummary();
    loadStoreQR();

    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
});

window.togglePaymentMethod = () => {
    const isAdvance = document.getElementById('upi-advance').checked;
    const qrSection = document.getElementById('qr-payment-section');
    const utrInput = document.getElementById('c-utr');
    
    if (isAdvance) {
        qrSection.style.display = 'block';
        utrInput.setAttribute('required', 'true');
    } else {
        qrSection.style.display = 'none';
        utrInput.removeAttribute('required');
    }
};

async function loadStoreQR() {
    try {
        const docSnap = await getDoc(doc(db, "store_settings", "general"));
        if (docSnap.exists() && docSnap.data().qrUrl) {
            document.getElementById('store-qr-img').src = docSnap.data().qrUrl;
            document.getElementById('store-qr-img').style.display = 'block';
            document.getElementById('qr-loading-text').style.display = 'none';
        } else {
            document.getElementById('qr-loading-text').innerText = 'No QR Code configured by Admin.';
        }
    } catch(e) {
        console.error(e);
        document.getElementById('qr-loading-text').innerText = 'Error loading QR code.';
    }
}

window.toggleDeliveryType = (type) => {
    const fields = document.getElementById('delivery-fields');
    const inputs = fields.querySelectorAll('input, select');
    
    if (type === 'Takeaway') {
        deliveryFee = 0;
        fields.style.display = 'none';
        inputs.forEach(i => i.removeAttribute('required'));
    } else {
        deliveryFee = 50;
        fields.style.display = 'block';
        inputs.forEach(i => {
            if(i.id !== 'c-notes') i.setAttribute('required', 'true');
        });
    }
    renderSummary();
};

function renderSummary() {
    const itemsContainer = document.getElementById('checkout-items');
    let subtotal = 0;
    
    itemsContainer.innerHTML = cart.map(item => {
        subtotal += (item.price * item.quantity);
        return `
            <div class="mini-item">
                <img src="${item.image || 'https://via.placeholder.com/60'}" class="mini-item-img" alt="${item.name}">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:0.95rem;">${item.name}</div>
                    <div style="color:var(--text-secondary); font-size:0.85rem;">Qty: ${item.quantity} | ${item.weight}</div>
                </div>
                <div style="font-weight:600;">${formatCurrency(item.price * item.quantity)}</div>
            </div>
        `;
    }).join('');

    totalAmount = subtotal + deliveryFee;

    document.getElementById('sum-subtotal').innerText = formatCurrency(subtotal);
    document.getElementById('sum-delivery').innerText = formatCurrency(deliveryFee);
    document.getElementById('sum-total').innerText = formatCurrency(totalAmount);
}

async function handleCheckout(e) {
    e.preventDefault();
    document.getElementById('loading-overlay').style.display = 'flex';

    const orderId = 'DG' + Math.floor(100000 + Math.random() * 900000);
    
    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    
    const customerInfo = {
        name: document.getElementById('c-name').value,
        phone: document.getElementById('c-phone').value,
        orderType: orderType,
    };

    if (orderType === 'Delivery') {
        customerInfo.address = document.getElementById('c-address').value;
        customerInfo.area = document.getElementById('c-area').value;
        customerInfo.pincode = document.getElementById('c-pin').value;
        customerInfo.deliverySlot = document.getElementById('c-slot').value;
        customerInfo.notes = document.getElementById('c-notes').value;
    }

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Read all required product documents first
            const productRefs = cart.map(item => doc(db, "products", item.id));
            const productDocs = [];
            for (let ref of productRefs) {
                const pDoc = await transaction.get(ref);
                if (!pDoc.exists()) {
                    throw new Error("Product does not exist!");
                }
                productDocs.push({ doc: pDoc, ref: ref });
            }

            // 2. Validate stock and perform updates
            productDocs.forEach((p, index) => {
                const cartItem = cart[index];
                const currentStock = p.doc.data().stockQuantity;
                
                if (currentStock < cartItem.quantity) {
                    throw new Error(`Insufficient stock for ${cartItem.name}. Available: ${currentStock}`);
                }

                const newStock = currentStock - cartItem.quantity;
                let newStatus = p.doc.data().status;
                
                if (newStock === 0) newStatus = 'Out Of Stock';
                else if (newStock <= 5) newStatus = 'Low Stock'; // Automatic low stock alert trigger

                transaction.update(p.ref, { 
                    stockQuantity: newStock,
                    status: newStatus
                });
            });

            // 3. Create the order document
            const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
            const utr = paymentMethod === 'UPI_Advance' ? document.getElementById('c-utr').value : null;

            const orderRef = doc(collection(db, "orders"));
            transaction.set(orderRef, {
                orderId: orderId,
                uid: null, // Link order to user if logged in
                customer: customerInfo,
                items: cart,
                subtotal: totalAmount - deliveryFee,
                deliveryFee: deliveryFee,
                totalAmount: totalAmount,
                paymentMethod: paymentMethod,
                transactionId: utr,
                status: 'Pending',
                createdAt: new Date().toISOString()
            });
        });

        // Clear cart
        saveCart([]);
        localStorage.removeItem('deliveryFee');
        
        // Success redirect
        document.getElementById('loading-overlay').innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 16px;">✅</div>
            <h2 style="color: var(--success-color);">Order Placed Successfully!</h2>
            <p style="color: var(--text-secondary); margin-top: 8px;">Order ID: ${orderId}</p>
        `;
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);

    } catch (error) {
        console.error("Transaction failed: ", error);
        document.getElementById('loading-overlay').style.display = 'none';
        showToast(error.message || 'Error processing order. Please try again.', 'error');
    }
}
