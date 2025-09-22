// Firebase v10 modular import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBh3-WxkF8lx2ts_zlOALOMLx6Ay-qSNn0",
  authDomain: "shoppingmall-966c4.firebaseapp.com",
  projectId: "shoppingmall-966c4",
  storageBucket: "shoppingmall-966c4.firebasestorage.app",
  messagingSenderId: "609408848467",
  appId: "1:609408848467:web:117989994c78884f106ca6",
  measurementId: "G-9DJBGEZMT0"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);