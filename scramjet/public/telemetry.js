// NXT Telemetry Client Module
const sessionId = "sess_" + Math.random().toString(36).substring(2, 10);

export function startHeartbeat(userEmail = "Authenticated User", pageName = "Portal") {
  function sendPulse() {
    fetch("/api/telemetry/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        user: userEmail,
        page: pageName
      })
    }).catch(() => {});
  }
  sendPulse();
  setInterval(sendPulse, 4000);
}

export function logActivity(type, userEmail, action, detail) {
  fetch("/api/telemetry/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: type || "ACTIVITY",
      user: userEmail || "User",
      action: action || "Action",
      detail: detail || ""
    })
  }).catch(() => {});
}
