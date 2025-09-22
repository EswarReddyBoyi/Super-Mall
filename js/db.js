// db.js
import { db } from "./../firebase-config.js";
import { doc, setDoc, getDoc, addDoc, collection, query, where, getDocs, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { logAction } from "./logger.js";

export function emailToId(email) {
  return encodeURIComponent(email).replace(/\./g, '%2E');
}

export async function createProfile(uid, email, role) {
  const emailId = emailToId(email);
  const emailRef = doc(db, "emails", emailId);
  const profileRef = doc(db, "profiles", uid);

  const snap = await getDoc(emailRef);
  if (snap.exists()) throw new Error("Email already exists");

  await setDoc(emailRef, { uid, email, role });
  await setDoc(profileRef, { uid, email, role, createdAt: serverTimestamp() });
  await logAction(uid, "createProfile", { email, role });
  return true;
}

export async function getProfileByUid(uid) {
  const d = await getDoc(doc(db, "profiles", uid));
  return d.exists() ? d.data() : null;
}

export async function getProfileByEmail(email) {
  const id = emailToId(email);
  const d = await getDoc(doc(db, "emails", id));
  return d.exists() ? d.data() : null;
}

// Shops
export async function createShop(docData) {
  const ref = await addDoc(collection(db, "shops"), { ...docData, createdAt: serverTimestamp() });
  await logAction(docData.ownerUid || null, "createShop", { shopId: ref.id });
  return ref.id;
}

export async function listShops() {
  const snap = await getDocs(collection(db, "shops"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateShop(shopId, data) {
  await updateDoc(doc(db, "shops", shopId), { ...data, updatedAt: serverTimestamp() });
  await logAction(null, "updateShop", { shopId, updatedFields: data });
}

export async function deleteShop(shopId) {
  await deleteDoc(doc(db, "shops", shopId));
  await logAction(null, "deleteShop", { shopId });
}

// Offers
export async function createOffer(data) {
  const ref = await addDoc(collection(db, "offers"), { ...data, createdAt: serverTimestamp() });
  await logAction(data.createdByUid || null, "createOffer", { offerId: ref.id });
  return ref.id;
}

export async function listOffers() {
  const snap = await getDocs(collection(db, "offers"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateOffer(offerId, data) {
  await updateDoc(doc(db, "offers", offerId), { ...data, updatedAt: serverTimestamp() });
  await logAction(null, "updateOffer", { offerId, updatedFields: data });
}

export async function deleteOffer(offerId) {
  await deleteDoc(doc(db, "offers", offerId));
  await logAction(null, "deleteOffer", { offerId });
}

// Admin requests
export async function listAdminRequests() {
  const q = query(collection(db, "emails"), where("role", "==", "admin_request"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function approveAdminByEmail(email) {
  const id = emailToId(email);
  const ref = doc(db, "emails", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Email not found");
  const uid = snap.data()?.uid;
  await updateDoc(ref, { role: "admin" });
  if (uid) await updateDoc(doc(db, "profiles", uid), { role: "admin" });
  await logAction(null, "approveAdmin", { email });
}
