// logger.js
import { db } from "./../firebase-config.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function logAction(uid, action, meta = {}) {
  try {
    await addDoc(collection(db, "logs"), {
      uid: uid || null,
      action,
      meta,
      ts: serverTimestamp()
    });
  } catch (err) {
    console.error("Logging error:", err);
  }
}
