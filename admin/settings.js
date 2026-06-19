import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { compressImageToBase64 } from '../utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const adminSession = sessionStorage.getItem('admin_token');
    if (adminSession !== 'authorized') {
        window.location.href = 'index.html';
        return;
    }
    
    loadSettings();

    document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
});

async function loadSettings() {
    try {
        const docSnap = await getDoc(doc(db, "store_settings", "general"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('s-email').value = data.email || '';
            document.getElementById('s-phone').value = data.phone || '';
            document.getElementById('s-address').value = data.address || '';
            
            if (data.logoUrl) {
                document.getElementById('logo-preview').src = data.logoUrl;
                document.getElementById('s-logo-url').value = data.logoUrl;
            }

            if (data.qrUrl) {
                const qrPreview = document.getElementById('qr-preview');
                qrPreview.src = data.qrUrl;
                qrPreview.style.display = 'block';
                document.getElementById('s-qr-url').value = data.qrUrl;
            }
        }
    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    const statusBox = document.getElementById('settings-status');
    
    btn.disabled = true;
    btn.innerText = 'Saving...';
    statusBox.style.display = 'none';

    try {
        let logoUrl = document.getElementById('s-logo-url').value;
        const fileInput = document.getElementById('s-logo');

        if (fileInput.files.length > 0) {
            btn.innerText = 'Compressing Logo...';
            const file = fileInput.files[0];
            logoUrl = await compressImageToBase64(file, 300); // 300px max width for logo
            document.getElementById('logo-preview').src = logoUrl;
            document.getElementById('s-logo-url').value = logoUrl;
        }

        let qrUrl = document.getElementById('s-qr-url').value;
        const qrInput = document.getElementById('s-qr');

        if (qrInput.files.length > 0) {
            btn.innerText = 'Compressing QR Code...';
            const file = qrInput.files[0];
            qrUrl = await compressImageToBase64(file, 400); // 400px max width for QR
            
            const qrPreview = document.getElementById('qr-preview');
            qrPreview.src = qrUrl;
            qrPreview.style.display = 'block';
            document.getElementById('s-qr-url').value = qrUrl;
        }

        const data = {
            email: document.getElementById('s-email').value,
            phone: document.getElementById('s-phone').value,
            address: document.getElementById('s-address').value,
            logoUrl: logoUrl,
            qrUrl: qrUrl,
            updatedAt: new Date().toISOString()
        };

        btn.innerText = 'Saving to Database...';
        await setDoc(doc(db, "store_settings", "general"), data, { merge: true });
        
        statusBox.style.color = 'green';
        statusBox.innerText = 'Settings saved successfully!';
        statusBox.style.display = 'block';

    } catch (err) {
        console.error(err);
        statusBox.style.color = 'var(--error-color)';
        statusBox.innerText = 'Error: ' + err.message;
        statusBox.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save Settings';
    }
}
