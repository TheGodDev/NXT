// ─────────────────────────────────────────────────────────────────────────────
// NXT Dashboard — Firebase auth guard, sign-out, and panic button
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp }         from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
                                 from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { setPersistence, browserSessionPersistence }
                                 from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { firebaseConfig }        from "./firebase-config.js";
import "./panic.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((error) => console.error("Unable to set session auth", error));

const currentRole       = document.body.dataset.role;
const launchProxyButton = document.querySelector("#launch-proxy");
const logoutBtn         = document.querySelector(".logout");

// ── Auth guard — boot anyone who isn't logged in (or wrong role) ──────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("/");
    return;
  }

  // Check custom claim for role enforcement
  user.getIdTokenResult().then((result) => {
    const role = result.claims.role ?? "user";
    if (currentRole === "admin" && role !== "admin") {
      // Regular users cannot access admin page
      window.location.replace("user.html");
    }
  });
});

// ── Sign out ──────────────────────────────────────────────────────────────────
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("/");
  });
}

// ── Launch proxy ──────────────────────────────────────────────────────────────
const launchOSButton    = document.querySelector("#launch-os");

if (launchProxyButton) {
  launchProxyButton.addEventListener("click", () => {
    // Keep the proxy as a same-origin application so its service worker,
    // Wisp endpoint, and static assets use the same host as the portal.
    window.location.assign("/proxy/");
  });
}

if (launchOSButton) {
  launchOSButton.addEventListener("click", () => {
    window.location.assign("/os.html");
  });
}
