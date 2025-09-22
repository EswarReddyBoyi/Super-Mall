// register.js
import { registerWithEmail } from "./auth.js";
import { createProfile, getProfileByEmail } from "./db.js";
import { logAction } from "./logger.js";

function getQueryRole() {
  const p = new URLSearchParams(location.search).get("role");
  if (p === "admin") return "admin_request";
  return "user";
}

document.addEventListener("DOMContentLoaded", () => {
  const roleDefault = getQueryRole();
  document.getElementById("roleSelect").value = roleDefault;
  document.getElementById("title").textContent = roleDefault === "admin_request" ? "Register (Admin Request)" : "Register (User)";

  const form = document.getElementById("registerForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("roleSelect").value; // 'user' or 'admin_request'
    const msg = document.getElementById("msg");
    msg.textContent = "";

    try {
      // Check if email is already mapped to a role
      const existing = await getProfileByEmail(email);
      if (existing) {
        msg.textContent = `This email is already registered as "${existing.role}". Use that account or a different email.`;
        await logAction(null, "registerAttemptDuplicateEmail", { email, existingRole: existing.role });
        return;
      }

      // Create auth user
      const cred = await registerWithEmail(email, password);
      // Create profile and email mapping
      await createProfile(cred.user.uid, email, role);
      msg.style.color = "green";
      msg.textContent = role === "admin_request" ? "Registered. Admin approval pending." : "Registered successfully. You may login.";
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Registration failed";
      await logAction(null, "registerFailed", { error: err.message });
    }
  });
});
