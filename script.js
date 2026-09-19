// ─────────────────────────────────────────────────────────────────────────────
// NXT Login — Firebase Email/Password Authentication
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp }                                          from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, onAuthStateChanged,
         setPersistence, browserSessionPersistence }     from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { firebaseConfig }                                         from "./firebase-config.js";

// ── Init ──────────────────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(() => {});

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form           = document.getElementById("login-form");
const emailInput     = document.getElementById("email");
const passwordInput  = document.getElementById("password");
const confirmField   = document.getElementById("confirm-field");
const confirmInput   = document.getElementById("confirm-password");
const showPwdBtn     = document.getElementById("show-password");
const errorMsg       = document.getElementById("error-message");
const signInBtn      = document.getElementById("sign-in-btn");
const panicBtn       = document.getElementById("panic-btn");
const modeSwitch     = document.getElementById("mode-switch");
const modeHint       = document.getElementById("mode-hint");
const loginHeading   = document.getElementById("login-heading");
const adminModeSwitch = document.getElementById("admin-mode-switch");
const emailLabel      = document.querySelector("label[for='email']");

// ── Mode state — 'signin' | 'signup' | 'admin' ───────────────────────────────
let mode = "signin";

function setMode(newMode) {
  mode = newMode;
  errorMsg.textContent = "";
  confirmInput.value   = "";
  passwordInput.value  = "";

  if (mode === "signup") {
    loginHeading.textContent              = "Create Account";
    signInBtn.querySelector(".btn-label").textContent = "Create Account";
    confirmField.style.display            = "block";
    emailLabel.textContent                = "Email";
    emailInput.type                       = "email";
    emailInput.placeholder                = "you@example.com";
    modeHint.textContent                  = "Already have an account?";
    modeSwitch.textContent                = "Sign in";
  } else if (mode === "admin") {
    loginHeading.textContent              = "Admin Sign In";
    signInBtn.querySelector(".btn-label").textContent = "Sign In as Admin";
    confirmField.style.display            = "none";
    emailLabel.textContent                = "Username";
    emailInput.type                       = "text";
    emailInput.placeholder                = "admin";
    modeHint.textContent                  = "Standard user?";
    modeSwitch.textContent                = "Sign in as user";
  } else {
    loginHeading.textContent              = "Sign In";
    signInBtn.querySelector(".btn-label").textContent = "Sign In";
    confirmField.style.display            = "none";
    emailLabel.textContent                = "Email";
    emailInput.type                       = "email";
    emailInput.placeholder                = "you@example.com";
    modeHint.textContent                  = "New here?";
    modeSwitch.textContent                = "Create an account";
  }
}

modeSwitch.addEventListener("click", () => {
  setMode(mode === "signup" ? "signin" : (mode === "admin" ? "signin" : "signup"));
});

if (adminModeSwitch) {
  adminModeSwitch.addEventListener("click", () => {
    setMode(mode === "admin" ? "signin" : "admin");
  });
}

// ── Background canvas animation ───────────────────────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const PARTICLE_COUNT = 55;
  const particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      r:    1 + Math.random() * 2.2,
      dx:   (Math.random() - 0.5) * 0.38,
      dy:   (Math.random() - 0.5) * 0.38,
      hue:  120 + Math.random() * 30,
      alpha:0.18 + Math.random() * 0.45,
    });
  }

  const orbs = [
    { x: 0.15, y: 0.25, r: 320, phase: 0 },
    { x: 0.82, y: 0.70, r: 280, phase: 2.1 },
    { x: 0.50, y: 0.90, r: 200, phase: 4.2 },
  ];

  let t = 0;

  function drawOrbs() {
    for (const orb of orbs) {
      const pulse = 1 + 0.08 * Math.sin(t * 0.6 + orb.phase);
      const grad = ctx.createRadialGradient(
        orb.x * canvas.width, orb.y * canvas.height, 0,
        orb.x * canvas.width, orb.y * canvas.height, orb.r * pulse
      );
      grad.addColorStop(0,   "rgba(34,197,94,0.09)");
      grad.addColorStop(0.5, "rgba(22,163,74,0.04)");
      grad.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(34,197,94,0.04)";
    ctx.lineWidth   = 1;
    const step = 72;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#020403";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawOrbs();

    for (const p of particles) {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},85%,55%,${p.alpha})`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(34,197,94,${0.13 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    t += 0.016;
    requestAnimationFrame(tick);
  }
  tick();
})();

// ── Auth state — redirect already-logged-in users ─────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    const isLocalAdmin = localStorage.getItem("nxt_admin") === "true" || user.email?.startsWith("admin");
    user.getIdTokenResult().then((result) => {
      const role = result.claims.role;
      window.location.href = (role === "admin" || isLocalAdmin) ? "admin.html" : "user.html";
    });
  }
});

// ── Show / Hide password ──────────────────────────────────────────────────────
showPwdBtn.addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  showPwdBtn.textContent = showing ? "Show" : "Hide";
  showPwdBtn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

// ── Error code → friendly message ─────────────────────────────────────────────
function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid username or email.";
    case "auth/email-already-in-use":
      return "An account with that username/email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Username/email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Try again later.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your administrator.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// ── Form submit ───────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  let loginEmail = emailInput.value.trim();
  const password = passwordInput.value;

  if (mode === "admin") {
    let inputUser = emailInput.value.trim();
    if (!inputUser.includes("@")) {
      inputUser = `${inputUser}@nxt.internal`;
    }

    if (inputUser !== "admin@nxt.internal" || password !== "nxtwebtechnologies$") {
      errorMsg.textContent = "Invalid admin username or password.";
      passwordInput.value  = "";
      passwordInput.focus();
      return;
    }

    localStorage.setItem("nxt_admin", "true");
    window.location.href = "admin.html";
    return;
  }

  if (!loginEmail || !password) {
    errorMsg.textContent = mode === "admin" ? "Please enter your username and password." : "Please enter your email and password.";
    return;
  }

  // Extra validation in create-account mode
  if (mode === "signup") {
    const confirm = confirmInput.value;
    if (password !== confirm) {
      errorMsg.textContent = "Passwords don't match.";
      confirmInput.value   = "";
      confirmInput.focus();
      return;
    }
    if (password.length < 6) {
      errorMsg.textContent = "Password must be at least 6 characters.";
      return;
    }
  }

  // Loading state
  signInBtn.classList.add("loading");
  signInBtn.disabled = true;

  try {
    if (mode === "signup") {
      localStorage.removeItem("nxt_admin");
      await createUserWithEmailAndPassword(auth, loginEmail, password);
    } else if (mode === "admin") {
      localStorage.setItem("nxt_admin", "true");
      try {
        await signInWithEmailAndPassword(auth, "admin@nxt.internal", "nxtwebtechnologies$");
      } catch (adminErr) {
        if (adminErr.code === "auth/user-not-found" || adminErr.code === "auth/invalid-credential") {
          try {
            await createUserWithEmailAndPassword(auth, "admin@nxt.internal", "nxtwebtechnologies$");
          } catch (createErr) {
            throw adminErr;
          }
        } else {
          throw adminErr;
        }
      }
    } else {
      localStorage.removeItem("nxt_admin");
      await signInWithEmailAndPassword(auth, loginEmail, password);
    }
  } catch (err) {
    errorMsg.textContent = friendlyError(err.code);
    passwordInput.value  = "";
    if (mode === "signup") confirmInput.value = "";
    passwordInput.focus();
  } finally {
    signInBtn.classList.remove("loading");
    signInBtn.disabled = false;
  }
});

// ── Panic → Google ────────────────────────────────────────────────────────────
panicBtn.addEventListener("click", () => {
  window.location.href = "https://www.google.com";
});
