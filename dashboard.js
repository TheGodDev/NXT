// ─────────────────────────────────────────────────────────────────────────────
// NXT Dashboard — Firebase auth guard, sign-out, and panic button
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp }         from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut,
         setPersistence, browserSessionPersistence }
                                 from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { firebaseConfig }        from "./firebase-config.js";
import "./panic.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(() => {});

const currentRole       = document.body.dataset.role;
const launchProxyButton = document.querySelector("#launch-proxy");
const launchOSButton    = document.querySelector("#launch-os");
const logoutBtn         = document.querySelector(".logout");
const panicButton       = document.querySelector(".panic-button");

// ── Auth guard — boot anyone who isn't logged in (or wrong role) ──────────────
onAuthStateChanged(auth, (user) => {
  const isLocalAdmin = localStorage.getItem("nxt_admin") === "true";
  if (!user && !isLocalAdmin) {
    window.location.replace("/index.html");
    return;
  }

  if (currentRole === "admin" && !isLocalAdmin) {
    window.location.replace("user.html");
  }
});

// ── Panic button → google.com ─────────────────────────────────────────────────
if (panicButton) {
  panicButton.addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });
}

// ── Sign out ──────────────────────────────────────────────────────────────────
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    localStorage.removeItem("nxt_admin");
    await signOut(auth).catch(() => {});
    window.location.replace("/index.html");
  });
}

// ── Launch proxy ──────────────────────────────────────────────────────────────
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

// ── Admin Live Telemetry Monitor ─────────────────────────────────────────────
if (currentRole === "admin") {
  const onlineCountEl = document.getElementById("stat-online-count");
  const eventCountEl  = document.getElementById("stat-event-count");
  const logBodyEl     = document.getElementById("telemetry-log-body");
  const sessionsListEl= document.getElementById("active-sessions-list");

  async function updateTelemetryData() {
    try {
      const res = await fetch("/api/telemetry/stats");
      if (!res.ok) return;
      const data = await res.json();

      if (onlineCountEl) onlineCountEl.textContent = data.onlineCount || 1;
      if (eventCountEl) eventCountEl.textContent = (data.recentLogs || []).length;

      // Update Live Telemetry Stream table
      if (logBodyEl && data.recentLogs) {
        if (data.recentLogs.length === 0) {
          logBodyEl.innerHTML = `<tr><td colspan="5" class="table-empty">No activity recorded yet. Waiting for live events...</td></tr>`;
        } else {
          logBodyEl.innerHTML = data.recentLogs.map(log => `
            <tr>
              <td class="log-time">${escapeHtml(log.timestamp)}</td>
              <td><span class="log-type ${log.type?.toLowerCase()}">${escapeHtml(log.type)}</span></td>
              <td class="log-user">${escapeHtml(log.user)}</td>
              <td class="log-action">${escapeHtml(log.action)}</td>
              <td class="log-detail">${escapeHtml(log.detail || '-')}</td>
            </tr>
          `).join("");
        }
      }

      // Update Active Sessions list
      if (sessionsListEl && data.sessions) {
        if (data.sessions.length === 0) {
          sessionsListEl.innerHTML = `
            <div class="session-item">
              <span class="pulse-dot green"></span>
              <div class="session-details">
                <strong>Admin (Current Session)</strong>
                <small>Connected on admin.html</small>
              </div>
            </div>
          `;
        } else {
          sessionsListEl.innerHTML = data.sessions.map(s => `
            <div class="session-item">
              <span class="pulse-dot green"></span>
              <div class="session-details">
                <strong>${escapeHtml(s.user)}</strong>
                <small>Active on ${escapeHtml(s.page)} • IP: ${escapeHtml(s.ip)}</small>
              </div>
            </div>
          `).join("");
        }
      }
    } catch (err) {
      // Retry on next interval
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  updateTelemetryData();
  setInterval(updateTelemetryData, 2000);
}
