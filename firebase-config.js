import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbITn008kajA7cE-ELT0HQS1U5YekssNs",
  authDomain: "dairy-garden.firebaseapp.com",
  projectId: "dairy-garden",
  storageBucket: "dairy-garden.firebasestorage.app",
  messagingSenderId: "835068372332",
  appId: "1:835068372332:web:ea71d110f1ee10c21cbf49",
  measurementId: "G-F0MEX5LRZV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, storage, auth, googleProvider };
