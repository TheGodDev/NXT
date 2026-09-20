export function startHeartbeat(user = "NXT OS User", label = "NXT OS Desktop") {
  try {
    if (typeof window !== "undefined") {
      window.nxtTelemetry = {
        user,
        label,
        startedAt: Date.now(),
      };
    }
  } catch (err) {
    // Ignore environments without a browser window.
  }

  return { user, label, startedAt: Date.now() };
}

export function logActivity(type = "OS_ACTION", user = "NXT OS User", message = "Action", detail = "") {
  const payload = { type, user, message, detail };

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nxt-os-log", { detail: payload }));
    }
  } catch (err) {
    // Ignore custom event issues in non-browser contexts.
  }

  if (typeof console !== "undefined") {
    console.debug("[NXT OS]", payload);
  }

  return payload;
}
