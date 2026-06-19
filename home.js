import { db } from './firebase-config.js';
import { collection, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initTheme, updateCartBadge, formatCurrency, getCart, saveCart, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateCartBadge();
    initGSAP();
    loadFeaturedProducts();
});

function initGSAP() {
    gsap.registerPlugin(ScrollTrigger);

    // Simplified animations to prevent scroll lag on mobile
    gsap.utils.toArray('.gs-fade-up').forEach(elem => {
        gsap.fromTo(elem, 
            { y: 20, opacity: 0 }, 
            { 
                y: 0, 
                opacity: 1, 
                duration: 0.8, 
                ease: "power2.out",
                scrollTrigger: {
                    trigger: elem,
                    start: "top 90%"
                }
            }
        );
    });
}

async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products-container');
    
    try {
        const q = query(collection(db, "products"), limit(8));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            container.innerHTML = '<div class="swiper-slide"><p style="text-align:center; padding: 40px;">No featured products available.</p></div>';
            return;
        }

        container.innerHTML = ''; 
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            product.id = doc.id;
            const productHTML = createProductCard(product);
            container.insertAdjacentHTML('beforeend', productHTML);
        });

        // Event listeners for quick add
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

    } catch (error) {
        console.error("Error loading products:", error);
    }
}

function createProductCard(product) {
    const name = product.name || 'Unknown Product';
    const image = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300';
    const status = product.status || 'Available';
    const weights = product.weightOptions || [];
    
    let displayPrice = 0;
    let defaultWeight = 'Standard';
    if (weights.length > 0) {
        displayPrice = weights[0].price;
        defaultWeight = weights[0].weight;
    }

    const isOut = status === 'Out Of Stock';

    return `
        <a href="product.html?id=${product.id}" class="product-card" style="height: 100%;">
            <div class="product-img-wrapper">
                ${status !== 'Available' ? `<span class="badge">${status}</span>` : ''}
                <img src="${image}" alt="${name}" class="product-img">
            </div>
            <div class="product-info">
                <h3 class="product-title">${name}</h3>
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 12px;">${defaultWeight}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <span class="product-price">${formatCurrency(displayPrice)}</span>
                    <button class="btn-outline btn-add-cart" 
                        style="padding: 8px 16px; border-radius: 8px;"
                        data-id="${product.id}" 
                        data-name="${name}" 
                        data-price="${displayPrice}" 
                        data-image="${image}"
                        data-weight="${defaultWeight}"
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
