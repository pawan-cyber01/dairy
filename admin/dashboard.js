import { db } from '../firebase-config.js';
import { collection, getDocs, getDoc, doc, query, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Utility to hash strings
async function hashString(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Check session
    const adminSession = sessionStorage.getItem('admin_token');
    if (adminSession === 'authorized') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-content').style.display = 'flex';
        loadStats();
        loadRecentOrders();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('admin-content').style.display = 'none';
    }

    let failedIdPass = 0;
    let failedPin = 0;
    let lockoutEnd = 0;
    let tempAuthData = null;
    let lockoutInterval = null;

    const step1Form = document.getElementById('step-1-form');
    const step2Form = document.getElementById('step-2-form');
    const errBox = document.getElementById('admin-error');
    const lockoutBox = document.getElementById('lockout-timer');
    const btn1 = document.getElementById('step-1-btn');
    const btn2 = document.getElementById('step-2-btn');

    function checkLockout() {
        const now = Date.now();
        if (lockoutEnd > now) {
            btn1.disabled = true;
            step1Form.style.opacity = '0.5';
            lockoutBox.style.display = 'block';
            errBox.style.display = 'none';
            
            if (lockoutInterval) clearInterval(lockoutInterval);
            
            lockoutInterval = setInterval(() => {
                const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000);
                if (remaining <= 0) {
                    clearInterval(lockoutInterval);
                    btn1.disabled = false;
                    step1Form.style.opacity = '1';
                    lockoutBox.style.display = 'none';
                    failedIdPass = 0; // Reset attempts after lockout
                } else {
                    lockoutBox.innerText = `Too many attempts. Try again in ${remaining}s`;
                }
            }, 1000);
            return true;
        }
        return false;
    }

    if (step1Form) {
        step1Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (checkLockout()) return;

            errBox.style.display = 'none';
            btn1.innerText = 'Verifying...';
            btn1.disabled = true;

            const adminId = document.getElementById('admin-id').value;
            const pass = document.getElementById('admin-pass').value;

            try {
                // Check if Firestore rules are blocking by catching permission denied
                let docSnap;
                try {
                    docSnap = await getDoc(doc(db, "admin_users", adminId));
                } catch (fbErr) {
                    throw new Error("Database Access Denied. Please ensure Firestore Security Rules allow read access to 'admin_users'.");
                }

                if (!docSnap.exists()) {
                    throw new Error("Invalid Admin ID");
                }

                const data = docSnap.data();
                const inputPassHash = await hashString(pass);

                if (inputPassHash !== data.passwordHash) {
                    throw new Error("Invalid Password");
                }

                // Success for Step 1
                tempAuthData = data;
                step1Form.style.display = 'none';
                step2Form.style.display = 'block';
                errBox.style.display = 'none';
                failedIdPass = 0; // Reset
                
            } catch (err) {
                failedIdPass++;
                if (failedIdPass >= 3) {
                    lockoutEnd = Date.now() + (29 * 1000); // 29 seconds
                    checkLockout();
                } else {
                    errBox.innerText = err.message + ` (${3 - failedIdPass} attempts left)`;
                    errBox.style.display = 'block';
                }
            } finally {
                btn1.innerText = 'Verify Credentials';
                if (!checkLockout()) btn1.disabled = false;
            }
        });
    }

    if (step2Form) {
        step2Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errBox.style.display = 'none';
            btn2.innerText = 'Authorizing...';
            btn2.disabled = true;

            const pin = document.getElementById('admin-pin').value;

            try {
                const inputPinHash = await hashString(pin);

                if (inputPinHash === tempAuthData.pinHash) {
                    // Final Success
                    sessionStorage.setItem('admin_token', 'authorized');
                    document.getElementById('login-overlay').style.display = 'none';
                    document.getElementById('admin-content').style.display = 'flex';
                    loadStats();
                    loadRecentOrders();
                } else {
                    throw new Error("Invalid Security PIN");
                }
            } catch (err) {
                failedPin++;
                if (failedPin >= 3) {
                    // Reset to step 1
                    failedPin = 0;
                    tempAuthData = null;
                    document.getElementById('admin-pin').value = '';
                    step2Form.style.display = 'none';
                    step1Form.style.display = 'block';
                    errBox.innerText = "Too many failed PIN attempts. Please login again.";
                    errBox.style.display = 'block';
                } else {
                    errBox.innerText = err.message + ` (${3 - failedPin} attempts left)`;
                    errBox.style.display = 'block';
                }
            } finally {
                btn2.innerText = 'Authorize Access';
                btn2.disabled = false;
            }
        });

        document.getElementById('btn-back-login').addEventListener('click', () => {
            tempAuthData = null;
            document.getElementById('admin-pin').value = '';
            step2Form.style.display = 'none';
            step1Form.style.display = 'block';
            errBox.style.display = 'none';
        });
    }

    document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
        sessionStorage.removeItem('admin_token');
        window.location.reload();
    });
});

async function loadStats() {
    try {
        const pSnap = await getDocs(collection(db, "products"));
        let products = 0;
        let alerts = 0;
        pSnap.forEach(doc => {
            products++;
            const stock = doc.data().stockQuantity || 0;
            if(stock <= 5) alerts++;
        });

        document.getElementById('stat-products').innerText = products;
        document.getElementById('stat-alerts').innerText = alerts;

        const oSnap = await getDocs(collection(db, "orders"));
        let orders = 0;
        let rev = 0;
        oSnap.forEach(doc => {
            orders++;
            rev += doc.data().totalAmount || 0;
        });

        document.getElementById('stat-orders').innerText = orders;
        document.getElementById('stat-revenue').innerText = '₹' + rev.toLocaleString();
        
    } catch (e) {
        console.error(e);
    }
}

async function loadRecentOrders() {
    const list = document.getElementById('recent-orders-list');
    try {
        const q = query(collection(db, "orders"), limit(5));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            list.innerHTML = '<p>No orders yet.</p>';
            return;
        }

        list.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Order ID</th>
                    <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Customer</th>
                    <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Amount</th>
                    <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Status</th>
                </tr>
                ${snap.docs.map(doc => {
                    const data = doc.data();
                    return `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 16px 12px; font-weight: 500;">${data.orderId}</td>
                            <td style="padding: 16px 12px;">${data.customer.name}</td>
                            <td style="padding: 16px 12px;">₹${data.totalAmount}</td>
                            <td style="padding: 16px 12px;"><span style="padding: 4px 8px; border-radius: 4px; background: rgba(0,0,0,0.05); font-size: 0.85rem;">${data.status}</span></td>
                        </tr>
                    `;
                }).join('')}
            </table>
        `;

    } catch(e) {
        console.error(e);
    }
}
