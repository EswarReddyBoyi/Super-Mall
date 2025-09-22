// auth.js
import { auth } from "./../firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { logAction } from "./logger.js";

export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await logAction(cred.user.uid, "register");
  return cred;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await logAction(cred.user.uid, "login");
  return cred;
}

export async function logout() {
  const uid = auth.currentUser?.uid || null;
  await signOut(auth);
  await logAction(uid, "logout");
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, (user) => cb(user));
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
  return true;
}
