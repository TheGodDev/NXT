const currentRole = document.body.dataset.role;
const panicButton = document.querySelector(".panic-button");
const launchProxyButton = document.querySelector("#launch-proxy");

if (panicButton) {
  panicButton.addEventListener("click", () => {
    window.open("https://login.classlink.com/my/loudoun", "_blank", "noopener,noreferrer");
  });
}

if (sessionStorage.getItem("nxtRole") !== currentRole) {
  window.location.replace("index.html");
}

if (launchProxyButton) {
  launchProxyButton.addEventListener("click", () => {
    // Keep the proxy as a same-origin application so its service worker,
    // Wisp endpoint, and static assets use the same host as the portal.
    window.location.assign("/proxy/");
  });
}

document.querySelector(".logout").addEventListener("click", () => {
  sessionStorage.removeItem("nxtRole");
  window.location.replace("index.html");
});
