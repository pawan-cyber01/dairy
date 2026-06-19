import { db } from '../firebase-config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allOrders = [];

document.addEventListener('DOMContentLoaded', () => {
    const adminSession = sessionStorage.getItem('admin_token');
    if (adminSession !== 'authorized') {
        window.location.href = 'index.html';
        return;
    }
    
    loadOrders();

    document.getElementById('filter-status').addEventListener('change', renderOrders);
});

async function loadOrders() {
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        allOrders = [];
        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allOrders.push(data);
        });

        renderOrders();
    } catch (e) {
        console.error(e);
        document.getElementById('orders-container').innerHTML = '<p style="color:red;">Error loading orders.</p>';
    }
}

function renderOrders() {
    const container = document.getElementById('orders-container');
    const filter = document.getElementById('filter-status').value;
    
    let filtered = allOrders;
    if(filter !== 'All') {
        filtered = allOrders.filter(o => o.status === filter);
    }

    if(filtered.length === 0) {
        container.innerHTML = '<p>No orders found.</p>';
        return;
    }

    container.innerHTML = filtered.map((o, i) => `
        <div class="order-card" style="display: block; padding: 0;">
            <!-- Header -->
            <div style="background: rgba(43,78,56,0.03); padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
                <div>
                    <h3 style="font-size: 1.25rem; font-family: var(--font-serif); color: var(--brand-color); margin-bottom: 4px;">#${o.orderId}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.85rem;">Placed: ${new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div>
                    <span style="padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; 
                        ${o.status === 'Pending' ? 'background: #fff3cd; color: #856404;' : 
                          o.status === 'Delivered' ? 'background: #d4edda; color: #155724;' : 
                          o.status === 'Cancelled' ? 'background: #f8d7da; color: #721c24;' : 
                          'background: #cce5ff; color: #004085;'}">
                        ${o.status}
                    </span>
                </div>
            </div>

            <div style="padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                <!-- Customer Details -->
                <div>
                    <h4 style="font-size: 0.95rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Customer Details</h4>
                    <p style="font-size: 1rem; font-weight: 600; margin-bottom: 4px;">${o.customer.name}</p>
                    <p style="font-size: 0.95rem; margin-bottom: 8px;">📞 ${o.customer.phone}</p>
                    <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 8px;">
                        ${o.customer.orderType === 'Takeaway' ? 
                            '<span style="background: var(--surface-color); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--brand-color); color: var(--brand-color); font-weight: 600;">🛍️ Store Takeaway</span>' : 
                            `📍 ${o.customer.address}, ${o.customer.area} - ${o.customer.pincode}`
                        }
                    </p>
                    ${o.customer.orderType !== 'Takeaway' ? `<p style="font-size: 0.9rem; color: var(--text-secondary);"><strong>Slot:</strong> ${o.customer.deliverySlot}</p>` : ''}
                    ${o.customer.notes ? `<p style="font-size: 0.9rem; color: #856404; background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 8px;">📝 Note: ${o.customer.notes}</p>` : ''}
                </div>
                
                <!-- Order Items -->
                <div>
                    <h4 style="font-size:0.95rem; margin-bottom:12px;">Order Items</h4>
                    <div style="font-size:0.9rem; margin-bottom:16px;">
                        ${o.items.map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--border-color);">
                                <div style="display: flex; gap: 12px; align-items: center;">
                                    <div style="background: var(--brand-color); color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${item.quantity}</div>
                                    <div>
                                        <div style="font-weight: 500; font-size: 0.95rem;">${item.name}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.weight}</div>
                                    </div>
                                </div>
                                <div style="font-weight: 600;">₹${item.price * item.quantity}</div>
                            </div>
                        `).join('')}
                        
                        <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 0.9rem; color: var(--text-secondary);">
                            <span>Subtotal</span>
                            <span>₹${o.subtotal || o.totalAmount - (o.deliveryFee || 0)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.9rem; color: var(--text-secondary);">
                            <span>Delivery Fee</span>
                            <span>₹${o.deliveryFee || 0}</span>
                        </div>
                        ${o.paymentMethod === 'UPI_Advance' ? `
                            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.9rem; color: var(--brand-color);">
                                <span>Advance Paid (UPI)</span>
                                <span>- ₹50</span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">UTR: ${o.transactionId || 'N/A'}</div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--border-color); font-size: 1.1rem; font-weight: 700; color: var(--brand-color);">
                            <span>Total (COD)</span>
                            <span>₹${o.paymentMethod === 'UPI_Advance' ? o.totalAmount - 50 : o.totalAmount}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="no-print" style="padding: 20px 24px; background: rgba(0,0,0,0.01); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 var(--radius-lg) var(--radius-lg);">
                <div style="display: flex; gap: 8px;">
                    <button class="status-btn ${o.status === 'Pending' ? 'active' : ''}" onclick="updateStatus('${o.id}', 'Pending', ${i})">Pending</button>
                    <button class="status-btn ${o.status === 'Preparing' ? 'active' : ''}" onclick="updateStatus('${o.id}', 'Preparing', ${i})">Preparing</button>
                    <button class="status-btn ${o.status === 'Out For Delivery' ? 'active' : ''}" onclick="updateStatus('${o.id}', 'Out For Delivery', ${i})">Out For Delivery</button>
                    <button class="status-btn ${o.status === 'Delivered' ? 'active' : ''}" onclick="updateStatus('${o.id}', 'Delivered', ${i})">Delivered</button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="status-btn cancel ${o.status === 'Cancelled' ? 'active' : ''}" onclick="updateStatus('${o.id}', 'Cancelled', ${i})">Cancel Order</button>
                    <button class="btn-outline" style="padding: 6px 16px; font-size: 0.85rem; color: var(--error-color); border-color: var(--error-color);" onclick="deleteOrder('${o.id}')">🗑️ Delete</button>
                    <button class="btn-outline" style="padding: 6px 16px; font-size: 0.85rem;" onclick="window.print()">🖨️ Print Invoice</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.updateStatus = async (docId, newStatus, arrayIndex) => {
    try {
        await updateDoc(doc(db, "orders", docId), { status: newStatus });
        allOrders[arrayIndex].status = newStatus;
        renderOrders();
    } catch(e) {
        alert("Failed to update status");
        console.error(e);
    }
};

window.deleteOrder = async (docId) => {
    if(confirm("Are you sure you want to permanently delete this order? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "orders", docId));
            loadOrders();
        } catch(e) {
            alert("Failed to delete order");
            console.error(e);
        }
    }
};
