import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((error) => console.error("Unable to set session auth", error));

export function requireSignedIn() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace("/");
      return;
    }

    document.documentElement.classList.remove("auth-pending");
  });
}

export async function signOutAndReturn() {
  await signOut(auth);
  window.location.replace("/");
}

export function signOutOnPageExit() {
  window.addEventListener("pagehide", () => {
    signOut(auth).catch(() => {});
  });
}

export function bindSignOutButtons(selector = ".logout") {
  document.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await signOutAndReturn();
      } catch (error) {
        button.disabled = false;
        console.error("Unable to sign out", error);
      }
    });
  });
}