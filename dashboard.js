const currentRole = document.body.dataset.role;

if (sessionStorage.getItem("nxtRole") !== currentRole) {
  window.location.replace("index.html");
}

document.querySelector(".logout").addEventListener("click", () => {
  sessionStorage.removeItem("nxtRole");
  window.location.replace("index.html");
});
