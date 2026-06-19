import { db } from '../firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { compressImageToBase64 } from '../utils.js';

let products = [];

document.addEventListener('DOMContentLoaded', () => {
    const adminSession = sessionStorage.getItem('admin_token');
    if (adminSession !== 'authorized') {
        window.location.href = 'index.html';
        return;
    }
    
    loadProducts();

    // Modal logic
    const modal = document.getElementById('product-modal');
    document.getElementById('btn-add-new').addEventListener('click', () => {
        document.getElementById('product-form').reset();
        document.getElementById('p-id').value = '';
        document.getElementById('p-image-url').value = '';
        document.getElementById('p-image-preview').style.display = 'none';
        document.getElementById('p-active').checked = true;
        document.getElementById('modal-title').innerText = 'Add New Product';
        renderVariantsUI([]);
        modal.style.display = 'flex';
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    document.getElementById('btn-add-variant').addEventListener('click', () => {
        addVariantRow('', '');
    });

    document.getElementById('product-form').addEventListener('submit', handleSaveProduct);
});

async function loadProducts() {
    const list = document.getElementById('products-list');
    list.innerHTML = '<tr><td colspan="5" style="padding:12px;">Loading...</td></tr>';
    
    try {
        const snap = await getDocs(collection(db, "products"));
        products = [];
        
        if (snap.empty) {
            list.innerHTML = '<tr><td colspan="5" style="padding:12px;">No products found.</td></tr>';
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            products.push(data);
        });

        renderTable();
    } catch (e) {
        console.error(e);
        list.innerHTML = '<tr><td colspan="5" style="padding:12px; color:red;">Error loading products.</td></tr>';
    }
}

function renderTable() {
    const list = document.getElementById('products-list');
    list.innerHTML = products.map((p, i) => `
        <tr style="border-bottom: 1px solid var(--border-color); opacity: ${p.isActive === false ? '0.5' : '1'};">
            <td style="padding: 12px;"><img src="${p.images?.[0] || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; object-fit:contain; border-radius:4px; border:1px solid #ddd;"></td>
            <td style="padding: 12px; font-weight:500;">
                ${p.name}
                ${p.isActive === false ? '<span style="font-size: 0.75rem; color: var(--error-color); margin-left: 8px;">(Disabled)</span>' : ''}
            </td>
            <td style="padding: 12px;">
                ${p.stockQuantity} 
                ${p.stockQuantity <= 5 ? '<span style="color:var(--error-color); font-size:0.8rem; font-weight:bold;">(LOW)</span>' : ''}
            </td>
            <td style="padding: 12px;"><span style="padding: 4px 8px; border-radius: 4px; background: rgba(0,0,0,0.05); font-size: 0.85rem;">${p.status}</span></td>
            <td style="padding: 12px;">
                <button class="btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:${p.isActive !== false ? 'var(--error-color)' : 'var(--success-color)'}; color:${p.isActive !== false ? 'var(--error-color)' : 'var(--success-color)'}; margin-right: 4px;" onclick="toggleProductActive('${p.id}', ${p.isActive !== false})">${p.isActive !== false ? 'Disable' : 'Enable'}</button>
                <button class="btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:var(--brand-color);" onclick="editProduct(${i})">Edit</button>
                <button class="btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:var(--error-color); color:var(--error-color);" onclick="deleteProduct('${p.id}')">Del</button>
            </td>
        </tr>
    `).join('');
}

window.toggleProductActive = async (id, currentStatus) => {
    try {
        await setDoc(doc(db, "products", id), { isActive: !currentStatus }, { merge: true });
        loadProducts();
    } catch(e) {
        alert("Error updating product");
        console.error(e);
    }
};

window.editProduct = (index) => {
    const p = products[index];
    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-stock').value = p.stockQuantity || 0;
    document.getElementById('p-status').value = p.status || 'Available';
    document.getElementById('p-active').checked = p.isActive !== false;
    
    const imgUrl = p.images?.[0] || '';
    document.getElementById('p-image-url').value = imgUrl;
    
    const preview = document.getElementById('p-image-preview');
    if (imgUrl) {
        preview.src = imgUrl;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    renderVariantsUI(p.weightOptions || []);

    document.getElementById('p-desc').value = p.description || '';
    document.getElementById('p-nutri').value = p.nutritionFacts || '';
    document.getElementById('p-store').value = p.storageGuide || '';
    
    document.getElementById('modal-title').innerText = 'Edit Product';
    document.getElementById('product-modal').style.display = 'flex';
};

function renderVariantsUI(variants) {
    const container = document.getElementById('variants-container');
    container.innerHTML = '';
    if (variants.length === 0) {
        addVariantRow('500ml', '50');
    } else {
        variants.forEach(v => addVariantRow(v.weight, v.price));
    }
}

function addVariantRow(weight, price) {
    const container = document.getElementById('variants-container');
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.innerHTML = `
        <input type="text" class="form-control var-weight" placeholder="e.g. 500ml or 1L" value="${weight}" required style="flex: 2;">
        <input type="number" class="form-control var-price" placeholder="Price (₹)" value="${price}" required style="flex: 1;" min="0">
        <button type="button" class="btn-outline" style="padding: 10px; border-color: var(--error-color); color: var(--error-color);" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(row);
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.innerText = 'Saving...';

    const idInput = document.getElementById('p-id').value;
    const docId = idInput || 'prod_' + Date.now();

    try {
        // 1. Handle File Upload if selected
        const fileInput = document.getElementById('p-image-upload');
        let finalImageUrl = document.getElementById('p-image-url').value;

        if (fileInput.files.length > 0) {
            btn.innerText = 'Compressing Image...';
            const file = fileInput.files[0];
            finalImageUrl = await compressImageToBase64(file, 600);
            document.getElementById('p-image-preview').src = finalImageUrl;
            document.getElementById('p-image-preview').style.display = 'block';
            document.getElementById('p-image-url').value = finalImageUrl;
        }

        // 2. Build Variants Array
        const variantRows = document.querySelectorAll('.variant-row');
        const weights = [];
        variantRows.forEach(row => {
            const w = row.querySelector('.var-weight').value.trim();
            const p = parseFloat(row.querySelector('.var-price').value);
            if (w && !isNaN(p)) {
                weights.push({ weight: w, price: p });
            }
        });

        if (weights.length === 0) {
            throw new Error("You must add at least one quantity/price option.");
        }

        // 3. Save to Firestore
        btn.innerText = 'Saving Details...';
        const data = {
            name: document.getElementById('p-name').value,
            stockQuantity: parseInt(document.getElementById('p-stock').value),
            status: document.getElementById('p-status').value,
            isActive: document.getElementById('p-active').checked,
            images: finalImageUrl ? [finalImageUrl] : [],
            weightOptions: weights,
            description: document.getElementById('p-desc').value,
            nutritionFacts: document.getElementById('p-nutri').value,
            storageGuide: document.getElementById('p-store').value,
            updatedAt: new Date().toISOString()
        };

        if(!idInput) data.createdAt = new Date().toISOString();

        await setDoc(doc(db, "products", docId), data, { merge: true });
        
        document.getElementById('product-modal').style.display = 'none';
        loadProducts();
    } catch(err) {
        console.error(err);
        alert(err.message || "Failed to save product. Ensure Storage rules allow uploads.");
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save Product';
        document.getElementById('p-image-upload').value = '';
    }
}

window.deleteProduct = async (id) => {
    if(confirm("Are you sure you want to delete this product?")) {
        try {
            await deleteDoc(doc(db, "products", id));
            loadProducts();
        } catch(e) {
            alert("Error deleting product");
        }
    }
};
