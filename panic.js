export function bindPanicButtons(selector = ".nxt-panic, .panic-button") {
  document.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", () => {
      window.location.replace("https://www.google.com");
    });
  });
}

bindPanicButtons();