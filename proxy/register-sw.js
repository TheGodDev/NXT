/**
 * NXT Browser Proxy - Panic Button/Emergency Tab Masker
 * Instantly masks the active tab to an innocent webpage.
 */

// Configuration: Customize your safe fallback destination
const PANIC_CONFIG = {
  safeUrl: "https://www.google.com",
  safeTitle: "Google",
  safeFavicon: "https://google.com",
  hotkey: "Escape" // Pressing 'Escape' will instantly trigger the panic mask
};

function triggerEmergencyMask() {
  console.log("NXT Panic Triggered: Masking browser session...");

  // 1. Immediately replace the favicon to look like a safe page
  let favicon = document.querySelector("link[rel*='icon']");
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "shortcut icon";
    document.head.appendChild(favicon);
  }
  favicon.href = PANIC_CONFIG.safeFavicon;

  // 2. Change the tab title immediately
  document.title = PANIC_CONFIG.safeTitle;

  // 3. Clear out the active proxy DOM to prevent background visibility
  if (document.body) {
    document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff;">
        <p style="color: #666; font-size: 14px;">Loading workspace...</p>
      </div>
    `;
  }

  // 4. Force override the active history line and redirect the window location
  window.location.replace(PANIC_CONFIG.safeUrl);
}

// Initialize Panic Listeners when DOM content is interactive
document.addEventListener("DOMContentLoaded", () => {
  // Bind to the explicit Panic buttons present in index.html
  const panicButtons = document.querySelectorAll(".nxt-panic, .proxy-panic");
  
  panicButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      triggerEmergencyMask();
    });
  });

  // Bind to global window keydown event for seamless hotkey masking
  window.addEventListener("keydown", (e) => {
    if (e.key === PANIC_CONFIG.hotkey) {
      e.preventDefault();
      triggerEmergencyMask();
    }
  });
});
