// utils.js

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const initTheme = () => {
  const toggleBtn = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme');
  
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if(toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
  };

  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme('light');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }
};

export const showToast = (message, type = 'success') => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  
  if (type === 'error') {
    toast.style.backgroundColor = 'var(--error-color)';
    toast.style.color = '#fff';
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

export const getCart = () => {
  return JSON.parse(localStorage.getItem('cart') || '[]');
};

export const saveCart = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart));
};

export const updateCartBadge = () => {
  const cart = getCart();
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  
  const badges = [
      document.getElementById('header-cart-badge'),
      document.getElementById('mobile-cart-badge')
  ];

  badges.forEach(badge => {
      if (badge) {
          badge.innerText = count;
          badge.style.display = count > 0 ? 'inline-block' : 'none';
      }
  });
};

export const initBottomNav = () => {
    if (document.getElementById('mobile-bottom-nav')) return;
    
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('admin-setup.html') || path.includes('admin-setup')) return;

    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.className = 'mobile-bottom-nav';
    
    nav.innerHTML = `
        <a href="index.html" class="mobile-nav-item ${path.includes('index.html') || path.endsWith('/') ? 'active' : ''}">
            <span class="mobile-nav-icon">🏠</span>
            <span>Home</span>
        </a>
        <a href="products.html" class="mobile-nav-item ${path.includes('product') ? 'active' : ''}">
            <span class="mobile-nav-icon">🛍️</span>
            <span>Shop</span>
        </a>
        <a href="cart.html" class="mobile-nav-item ${path.includes('cart') || path.includes('checkout') ? 'active' : ''}" style="position: relative;">
            <span class="mobile-nav-icon">🛒</span>
            <span>Cart</span>
            <span class="badge" id="mobile-cart-badge" style="display:none; top:-4px; right:-10px;">0</span>
        </a>
        <a href="contact.html" class="mobile-nav-item ${path.includes('contact') ? 'active' : ''}">
            <span class="mobile-nav-icon">📞</span>
            <span>Contact</span>
        </a>
    `;
    
    document.body.appendChild(nav);
    updateCartBadge(); // Ensure badge is updated for the new element
};

async function applyDynamicSettings() {
    const cachedLogo = localStorage.getItem('store_logo');
    if (cachedLogo) {
        document.querySelectorAll('.logo-img, .admin-logo img').forEach(img => img.src = cachedLogo);
    }
    
    try {
        const docSnap = await getDoc(doc(db, "store_settings", "general"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.logoUrl && data.logoUrl !== cachedLogo) {
                localStorage.setItem('store_logo', data.logoUrl);
                document.querySelectorAll('.logo-img, .admin-logo img').forEach(img => img.src = data.logoUrl);
            }
        }
    } catch (e) {
        console.warn("Could not load dynamic store settings");
    }
}

// Initialize features immediately
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initBottomNav();
        applyDynamicSettings();
    });
}

export async function compressImageToBase64(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress as JPEG (0.7 quality is a good balance between size and quality)
                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                resolve(base64String);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
