// login.js
import { loginWithEmail } from "./auth.js";
import { getProfileByEmail } from "./db.js";
import { logAction } from "./logger.js";

document.addEventListener("DOMContentLoaded", () => {
  const roleHint = new URLSearchParams(location.search).get("role"); // 'admin' or 'user' hint
  document.getElementById("title").textContent = (roleHint === "admin") ? "Admin Login" : "Login";

  const loginForm = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      msg.textContent = "Please enter both email and password.";
      return;
    }

    try {
      // Get profile first
      const profile = await getProfileByEmail(email);

      if (!profile) {
        msg.textContent = "No account found with this email. Please register first.";
        await logAction(null, "loginFailedNoProfile", { email });
        return;
      }

      // Perform login
      const cred = await loginWithEmail(email, password);

      // Check profile role
      switch (profile.role) {
        case "admin":
          location.href = "admin-dashboard.html";
          break;

        case "admin_request":
          msg.textContent = "Your admin request is pending approval. You can log in as a normal user.";
          // Optional: redirect to user dashboard
          location.href = "user-dashboard.html";
          break;

        case "user":
          location.href = "user-dashboard.html";
          break;

        default:
          msg.textContent = `Unknown role: ${profile.role}. Contact support.`;
      }

      await logAction(cred.user.uid, "loginSuccess", { role: profile.role });

    } catch (err) {
      console.error("Login error:", err);
      msg.textContent = err.message || "Login failed. Check console for details.";
      await logAction(null, "loginFailed", { email, error: err.message });
    }
  });
});
