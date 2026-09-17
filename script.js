const accounts = {
  NXTADMIN: { password: "HELLOWORLDNXT", destination: "admin.html" },
  NXTUSER: { password: "NXTPWD", destination: "user.html" },
};

const form = document.querySelector("#login-form");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const errorMessage = document.querySelector("#error-message");
const showPassword = document.querySelector("#show-password");
const panicButton = document.querySelector(".panic-button");

if (panicButton) {
  panicButton.addEventListener("click", () => {
    window.open("https://login.classlink.com/my/loudoun", "_blank", "noopener,noreferrer");
  });
}

showPassword.addEventListener("click", () => {
  const showing = password.type === "text";
  password.type = showing ? "password" : "text";
  showPassword.textContent = showing ? "Show" : "Hide";
  showPassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const enteredUsername = username.value.trim().toUpperCase();
  const account = accounts[enteredUsername];

  if (account && password.value === account.password) {
    sessionStorage.setItem("nxtRole", enteredUsername === "NXTADMIN" ? "admin" : "user");
    window.location.href = account.destination;
    return;
  }

  errorMessage.textContent = "That username or password is not recognized.";
  password.value = "";
  password.focus();
});
