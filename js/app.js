import { auth, db } from "./../firebase-config.js";
import { logAction } from "./logging.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ---------- REGISTER ----------
async function registerUser(email, password, role) {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const existing = await getDocs(q);
    if (!existing.empty) {
      alert("This email is already registered!");
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await addDoc(collection(db, "users"), {
      uid: user.uid,
      email,
      role,
      createdAt: serverTimestamp()
    });

    logAction(user.uid, `${role} Registration Success`, { email });
    alert(`${role} registered successfully! Please login.`);
  } catch (error) {
    logAction(null, `${role} Registration Failed`, { email, error: error.message });
    alert(error.message);
  }
}

// Admin Register
const adminRegisterForm = document.getElementById("adminRegisterForm");
if (adminRegisterForm) {
  adminRegisterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("adminRegEmail").value;
    const password = document.getElementById("adminRegPassword").value;
    await registerUser(email, password, "admin");
  });
}

// User Register
const userRegisterForm = document.getElementById("userRegisterForm");
if (userRegisterForm) {
  userRegisterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("userRegEmail").value;
    const password = document.getElementById("userRegPassword").value;
    await registerUser(email, password, "user");
  });
}

// ---------- LOGIN ----------
async function loginUser(email, password, role) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const q = query(collection(db, "users"), where("uid", "==", user.uid), where("role", "==", role));
    const result = await getDocs(q);

    if (result.empty) {
      alert("Role mismatch. You cannot login here!");
      logAction(user.uid, `${role} Login Failed`, { email });
      await signOut(auth);
      return;
    }

    logAction(user.uid, `${role} Login Success`, { email });

    if (role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user.html";
    }

  } catch (error) {
    logAction(null, `${role} Login Error`, { email, error: error.message });
    alert(error.message);
  }
}

// Admin Login
const adminLoginForm = document.getElementById("adminLoginForm");
if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("adminLoginEmail").value;
    const password = document.getElementById("adminLoginPassword").value;
    await loginUser(email, password, "admin");
  });
}

// User Login
const userLoginForm = document.getElementById("userLoginForm");
if (userLoginForm) {
  userLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("userLoginEmail").value;
    const password = document.getElementById("userLoginPassword").value;
    await loginUser(email, password, "user");
  });
}

// ---------- ADMIN FEATURES ----------
const createShopForm = document.getElementById("createShopForm");
if (createShopForm) {
  createShopForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const shopName = document.getElementById("shopName").value;
    const category = document.getElementById("category").value;
    const floor = document.getElementById("floor").value;

    try {
      const ref = await addDoc(collection(db, "shops"), {
        shopName,
        category,
        floor,
        createdAt: serverTimestamp()
      });
      logAction("admin", "Shop Created", { shopId: ref.id, shopName });
      alert("Shop created!");
    } catch (error) {
      logAction("admin", "Shop Creation Failed", { error: error.message });
    }
  });
}

const createOfferForm = document.getElementById("createOfferForm");
if (createOfferForm) {
  createOfferForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("offerTitle").value;
    const details = document.getElementById("offerDetails").value;

    try {
      const ref = await addDoc(collection(db, "offers"), {
        title,
        details,
        createdAt: serverTimestamp()
      });
      logAction("admin", "Offer Created", { offerId: ref.id, title });
      alert("Offer added!");
    } catch (error) {
      logAction("admin", "Offer Creation Failed", { error: error.message });
    }
  });
}

// ---------- USER FEATURES ----------
const shopsList = document.getElementById("shopsList");
if (shopsList) {
  async function loadShops() {
    const querySnapshot = await getDocs(collection(db, "shops"));
    shopsList.innerHTML = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      shopsList.innerHTML += `<div><strong>${data.shopName}</strong> - ${data.category} (Floor: ${data.floor})</div>`;
    });
  }
  loadShops();
}

const offersList = document.getElementById("offersList");
if (offersList) {
  async function loadOffers() {
    const querySnapshot = await getDocs(collection(db, "offers"));
    offersList.innerHTML = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      offersList.innerHTML += `<div><strong>${data.title}</strong>: ${data.details}</div>`;
    });
  }
  loadOffers();
}
