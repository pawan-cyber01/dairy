import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initTheme, updateCartBadge, formatCurrency, getCart, saveCart, showToast } from './utils.js';

let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateCartBadge();
    fetchProducts();

    // Event listeners for filters
    document.getElementById('search-input').addEventListener('input', renderProducts);
    document.getElementById('sort-select').addEventListener('change', renderProducts);
    document.getElementById('instock-only').addEventListener('change', renderProducts);
    
    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.addEventListener('change', renderProducts);
    });
});

async function fetchProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        allProducts = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id;
            
            // Extract base price for sorting
            data.basePrice = 0;
            if (data.weightOptions && data.weightOptions.length > 0) {
                data.basePrice = data.weightOptions[0].price;
            }
            
            allProducts.push(data);
        });

        // Check URL for category preset
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('cat');
        if(cat) {
            const radio = document.querySelector(`input[name="category"][value="${cat}"]`);
            if(radio) radio.checked = true;
        }

        renderProducts();
    } catch (error) {
        console.error("Error fetching products: ", error);
        document.getElementById('products-grid').innerHTML = '<p style="color:red;">Error loading products.</p>';
    }
}

function renderProducts() {
    let filtered = [...allProducts];

    // Search
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    // Category
    const category = document.querySelector('input[name="category"]:checked').value;
    if (category !== 'All') {
        // Assume category is part of the name or we can add category field later.
        // For now, filtering by name since we don't have a strict category field yet.
        filtered = filtered.filter(p => p.name.toLowerCase().includes(category.toLowerCase()));
    }

    // In Stock
    const inStockOnly = document.getElementById('instock-only').checked;
    if (inStockOnly) {
        filtered = filtered.filter(p => p.status !== 'Out Of Stock');
    }

    // Sort
    const sortVal = document.getElementById('sort-select').value;
    if (sortVal === 'price-low') {
        filtered.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortVal === 'price-high') {
        filtered.sort((a, b) => b.basePrice - a.basePrice);
    } else {
        // newest (by createdAt if exists)
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    document.getElementById('results-count').innerText = `Showing ${filtered.length} products`;

    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: span 3; padding: 40px; text-align: center;">No products found.</p>';
        return;
    }

    filtered.forEach(product => {
        grid.insertAdjacentHTML('beforeend', createProductCard(product));
    });

    // Attach cart events
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            const price = parseFloat(e.target.getAttribute('data-price'));
            const image = e.target.getAttribute('data-image');
            const weight = e.target.getAttribute('data-weight');
            addToCart(id, name, price, image, weight);
        });
    });
}

function createProductCard(product) {
    const name = product.name || 'Unknown';
    const image = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300';
    const status = product.status || 'Available';
    const isOut = status === 'Out Of Stock';

    return `
        <a href="product.html?id=${product.id}" class="product-card">
            <div class="product-img-wrapper">
                ${status !== 'Available' ? `<span class="badge">${status}</span>` : ''}
                <img src="${image}" alt="${name}" class="product-img">
            </div>
            <div class="product-info">
                <h3 class="product-title">${name}</h3>
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">
                    ${product.weightOptions && product.weightOptions.length > 0 ? product.weightOptions[0].weight : 'Standard'}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <span class="product-price">${formatCurrency(product.basePrice)}</span>
                    <button class="btn-outline btn-add-cart" 
                        style="padding: 8px 16px; border-radius: 8px;"
                        data-id="${product.id}" 
                        data-name="${name}" 
                        data-price="${product.basePrice}" 
                        data-image="${image}"
                        data-weight="${product.weightOptions && product.weightOptions.length > 0 ? product.weightOptions[0].weight : 'Standard'}"
                        ${isOut ? 'disabled' : ''}>
                        ${isOut ? 'Out' : 'Add'}
                    </button>
                </div>
            </div>
        </a>
    `;
}

function addToCart(id, name, price, image, weight) {
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === id && item.weight === weight);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({ id, name, price, image, weight, quantity: 1 });
    }
    
    saveCart(cart);
    updateCartBadge();
    showToast(`${name} added to cart!`);
}
