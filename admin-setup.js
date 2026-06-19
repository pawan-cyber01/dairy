import { db } from './firebase-config.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function hashString(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('setup-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('setup-btn');
            const statusBox = document.getElementById('status');
            
            btn.innerText = 'Processing...';
            btn.disabled = true;
            statusBox.style.display = 'block';
            statusBox.style.color = 'var(--text-secondary)';
            statusBox.innerText = 'Hashing credentials...';

            try {
                const adminId = document.getElementById('setup-id').value;
                const rawPassword = document.getElementById('setup-pass').value;
                const rawPin = document.getElementById('setup-pin').value;
                
                const passwordHash = await hashString(rawPassword);
                const pinHash = await hashString(rawPin);

                statusBox.innerText = "Saving to Firestore...";

                // Save to admin_users collection using adminId as the document ID
                await setDoc(doc(db, "admin_users", adminId), {
                    passwordHash: passwordHash,
                    pinHash: pinHash,
                    createdAt: new Date().toISOString()
                });

                statusBox.style.color = 'green';
                statusBox.innerText = "Success! The secure admin credentials have been stored. You can now log into the Admin Dashboard.";
                form.reset();
            } catch (err) {
                console.error("Error setting up admin: ", err);
                statusBox.style.color = "var(--error-color)";
                statusBox.innerText = "Error: " + err.message;
            } finally {
                btn.innerText = 'Hash & Save to Database';
                btn.disabled = false;
            }
        });
    }
});
