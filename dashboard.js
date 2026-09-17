const currentRole = document.body.dataset.role;
const panicButton = document.querySelector(".panic-button");

if (panicButton) {
  panicButton.addEventListener("click", () => {
    window.open("https://login.classlink.com/my/loudoun", "_blank", "noopener,noreferrer");
  });
}

if (sessionStorage.getItem("nxtRole") !== currentRole) {
  window.location.replace("index.html");
}

document.querySelector(".logout").addEventListener("click", () => {
  sessionStorage.removeItem("nxtRole");
  window.location.replace("index.html");
});
