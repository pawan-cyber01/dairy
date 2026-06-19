import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initTheme, updateCartBadge, formatCurrency, getCart, saveCart, showToast } from './utils.js';

let currentProduct = null;
let selectedWeight = null;
let currentQuantity = 1;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateCartBadge();
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (id) {
        loadProduct(id);
    } else {
        document.getElementById('loading-msg').innerText = "Product not found.";
    }
});

async function loadProduct(id) {
    try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            currentProduct = docSnap.data();
            currentProduct.id = id;
            
            if (currentProduct.weightOptions && currentProduct.weightOptions.length > 0) {
                selectedWeight = currentProduct.weightOptions[0];
            }
            
            renderProduct();
        } else {
            document.getElementById('loading-msg').innerText = "Product not found.";
        }
    } catch (e) {
        console.error(e);
        document.getElementById('loading-msg').innerText = "Error loading product.";
    }
}

function renderProduct() {
    document.getElementById('loading-msg').style.display = 'none';
    document.getElementById('product-content').style.display = 'block';
    
    const { name, description, status, images, nutritionFacts, storageGuide, shelfLife } = currentProduct;
    
    document.getElementById('p-name').innerText = name;
    
    // Status Badge
    const statusEl = document.getElementById('p-status');
    statusEl.innerText = status;
    if(status === 'Out Of Stock') {
        statusEl.style.backgroundColor = 'var(--error-color)';
        document.getElementById('btn-add-cart').disabled = true;
    } else if(status === 'Low Stock') {
        statusEl.style.backgroundColor = 'var(--accent-color)';
    } else {
        statusEl.style.backgroundColor = 'var(--success-color)';
    }

    // Gallery
    const mainImg = document.getElementById('main-image');
    const thumbContainer = document.getElementById('thumb-container');
    if (images && images.length > 0) {
        mainImg.src = images[0];
        thumbContainer.innerHTML = images.map((img, i) => `
            <div class="thumb ${i === 0 ? 'active' : ''}" data-src="${img}">
                <img src="${img}">
            </div>
        `).join('');

        document.querySelectorAll('.thumb').forEach(t => {
            t.addEventListener('click', (e) => {
                document.querySelectorAll('.thumb').forEach(x => x.classList.remove('active'));
                const el = e.currentTarget;
                el.classList.add('active');
                mainImg.src = el.getAttribute('data-src');
            });
        });
    } else {
        mainImg.src = 'https://via.placeholder.com/600';
    }

    // Weights & Price
    if (currentProduct.weightOptions) {
        const wContainer = document.getElementById('weight-container');
        wContainer.innerHTML = currentProduct.weightOptions.map((w, i) => `
            <button class="weight-btn ${i === 0 ? 'active' : ''}" data-index="${i}">${w.weight}</button>
        `).join('');

        document.getElementById('p-price').innerText = formatCurrency(selectedWeight.price);

        document.querySelectorAll('.weight-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.weight-btn').forEach(x => x.classList.remove('active'));
                e.target.classList.add('active');
                selectedWeight = currentProduct.weightOptions[e.target.getAttribute('data-index')];
                document.getElementById('p-price').innerText = formatCurrency(selectedWeight.price);
            });
        });
    }

    // Tabs Content
    document.getElementById('tab-desc').innerHTML = `<p>${description || 'No description available.'}</p>`;
    document.getElementById('tab-nutri').innerHTML = `<p>${nutritionFacts || 'No nutritional info provided.'}</p>`;
    document.getElementById('tab-store').innerHTML = `
        <p><strong>Storage:</strong> ${storageGuide || 'Refrigerate below 4°C'}</p>
        <p style="margin-top:12px;"><strong>Shelf Life:</strong> ${shelfLife || 'Check packaging'}</p>
    `;

    // Quantity Controls
    const qtyInput = document.getElementById('qty-input');
    document.getElementById('qty-plus').addEventListener('click', () => {
        currentQuantity++;
        qtyInput.value = currentQuantity;
    });
    document.getElementById('qty-minus').addEventListener('click', () => {
        if(currentQuantity > 1) {
            currentQuantity--;
            qtyInput.value = currentQuantity;
        }
    });

    // Add to Cart
    document.getElementById('btn-add-cart').addEventListener('click', () => {
        const cart = getCart();
        const weight = selectedWeight ? selectedWeight.weight : 'Standard';
        const price = selectedWeight ? selectedWeight.price : 0;
        const img = images && images.length > 0 ? images[0] : '';
        
        const idx = cart.findIndex(i => i.id === currentProduct.id && i.weight === weight);
        if(idx > -1) {
            cart[idx].quantity += currentQuantity;
        } else {
            cart.push({
                id: currentProduct.id,
                name: currentProduct.name,
                price: price,
                image: img,
                weight: weight,
                quantity: currentQuantity
            });
        }
        
        saveCart(cart);
        updateCartBadge();
        showToast('Added to Cart');
    });

    // Tabs toggle
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
            
            e.target.classList.add('active');
            document.getElementById(e.target.getAttribute('data-target')).classList.add('active');
        });
    });
}
