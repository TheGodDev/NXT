// ─────────────────────────────────────────────────────────────────────────────
// NXT OS Engine — Window Manager, Global Chat, Notes/Files, Apps Hub & Terminal
// ─────────────────────────────────────────────────────────────────────────────

import { startHeartbeat, logActivity } from "./telemetry.js";
import { bindSignOutButtons } from "./auth.js";
import "./panic.js";

// Active session telemetry
startHeartbeat(localStorage.getItem("nxt_chat_username") || "NXT OS User", "NXT OS Desktop");

// ── Highest Z-Index Manager ──────────────────────────────────────────────────
let highestZ = 100;

function bringToFront(win) {
  if (!win) return;
  highestZ++;
  win.style.zIndex = highestZ;
  document.querySelectorAll(".win-shell").forEach(w => w.classList.remove("active-window"));
  win.classList.add("active-window");
}

// ── Open / Toggle Application Window ─────────────────────────────────────────
function openApp(appId) {
  const win = document.getElementById("win-" + appId);
  if (!win) return;

  if (win.style.display === "none" || win.classList.contains("minimized")) {
    win.style.display = "flex";
    win.classList.remove("minimized");
    logActivity("OS_APP", "NXT OS User", "Opened OS App", appId);
  }
  bringToFront(win);
  updateDockActiveStates();
}

function closeApp(appId) {
  const win = document.getElementById("win-" + appId);
  if (win) {
    win.style.display = "none";
  }
  updateDockActiveStates();
}

function minimizeApp(appId) {
  const win = document.getElementById("win-" + appId);
  if (win) {
    win.classList.add("minimized");
  }
  updateDockActiveStates();
}

function toggleMaximizeApp(win) {
  if (!win) return;
  win.classList.toggle("maximized");
}

function updateDockActiveStates() {
  document.querySelectorAll(".dock-item").forEach(item => {
    const appId = item.dataset.app;
    const win = document.getElementById("win-" + appId);
    if (win && win.style.display !== "none" && !win.classList.contains("minimized")) {
      item.classList.add("active-app");
    } else {
      item.classList.remove("active-app");
    }
  });
}

// ── Draggable Windows Engine ──────────────────────────────────────────────────
function initDraggableWindows() {
  document.querySelectorAll(".win-shell").forEach(win => {
    const header = win.querySelector(".win-header");
    if (!header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    win.addEventListener("mousedown", () => bringToFront(win));

    header.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("win-btn")) return;
      if (win.classList.contains("maximized")) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = win.offsetLeft;
      initialTop = win.offsetTop;
      bringToFront(win);

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      win.style.left = Math.max(0, initialLeft + dx) + "px";
      win.style.top  = Math.max(38, initialTop + dy) + "px";
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    // Window controls
    const controls = win.querySelector(".win-controls");
    if (controls) {
      controls.addEventListener("click", (e) => {
        const act = e.target.dataset.act;
        const appId = win.id.replace("win-", "");
        if (act === "close") closeApp(appId);
        if (act === "min") minimizeApp(appId);
        if (act === "max") toggleMaximizeApp(win);
      });
    }
  });
}

// ── Setup Desktop & Dock Icon Listeners ───────────────────────────────────────
function setupLaunchers() {
  document.querySelectorAll(".desktop-icon").forEach(icon => {
    icon.addEventListener("dblclick", () => openApp(icon.dataset.app));
    icon.addEventListener("click", () => openApp(icon.dataset.app));
  });

  document.querySelectorAll(".dock-item").forEach(item => {
    item.addEventListener("click", () => {
      const appId = item.dataset.app;
      const win = document.getElementById("win-" + appId);
      if (win && win.style.display !== "none" && !win.classList.contains("minimized") && win.classList.contains("active-window")) {
        minimizeApp(appId);
      } else {
        openApp(appId);
      }
    });
  });

  // Topbar menu items
  const menuApps = document.getElementById("menu-apps");
  const menuChat = document.getElementById("menu-chat");
  const menuNotes = document.getElementById("menu-notes");
  const menuTerm = document.getElementById("menu-terminal");

  if (menuApps) menuApps.addEventListener("click", () => openApp("apps"));
  if (menuChat) menuChat.addEventListener("click", () => openApp("chat"));
  if (menuNotes) menuNotes.addEventListener("click", () => openApp("notes"));
  if (menuTerm) menuTerm.addEventListener("click", () => openApp("terminal"));
}

function initAppTabs() {
  const tabs = document.querySelectorAll(".app-tab");
  const panels = document.querySelectorAll(".app-tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.appTab;

      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.appPanel === target);
      });
    });
  });
}

// ── 💬 Real-Time Global Chat Engine ─────────────────────────────────────────
function initChatSystem() {
  const userInput = document.getElementById("chat-user-input");
  const messagesContainer = document.getElementById("chat-messages-container");
  const chatForm = document.getElementById("chat-form");
  const msgInput = document.getElementById("chat-msg-input");
  const refreshButton = document.getElementById("btn-chat-refresh");
  const status = document.getElementById("chat-status");

  let storedUser = localStorage.getItem("nxt_chat_username") || "NXTUser_" + Math.floor(100 + Math.random() * 900);
  if (userInput) {
    userInput.value = storedUser;
    userInput.addEventListener("change", () => {
      storedUser = userInput.value.trim() || "NXTUser";
      localStorage.setItem("nxt_chat_username", storedUser);
    });
  }

  async function fetchMessages() {
    try {
      const res = await fetch("/api/chat/messages");
      if (!res.ok) return;
      const data = await res.json();
      renderMessages(data.messages || []);
      if (status) status.textContent = "● Online";
    } catch (err) {
      if (status) status.textContent = "● Offline";
    }
  }

  if (refreshButton) refreshButton.addEventListener("click", fetchMessages);

  function renderMessages(messages) {
    if (!messagesContainer) return;
    const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50;

    messagesContainer.innerHTML = messages.map(msg => {
      const isMine = msg.user === storedUser;
      return `
        <div class="chat-msg ${isMine ? "mine" : ""}">
          <div class="msg-header">
            <span class="user-name">${escapeHtml(msg.user)}</span>
            <span>• ${escapeHtml(msg.timestamp)}</span>
          </div>
          <div class="msg-bubble">${escapeHtml(msg.message)}</div>
        </div>
      `;
    }).join("");

    if (isAtBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = msgInput.value.trim();
      const user = userInput ? userInput.value.trim() : storedUser;
      if (!text || !user) return;

      msgInput.value = "";
      try {
        await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user, message: text })
        });
        fetchMessages();
      } catch (err) {}
    });
  }

  fetchMessages();
  setInterval(fetchMessages, 2500);
}

// ── 📁 Notes & Files Engine ──────────────────────────────────────────────────
function initNotesSystem() {
  const notesListEl = document.getElementById("notes-list");
  const titleInput = document.getElementById("note-title");
  const contentArea = document.getElementById("note-content");
  const btnNew = document.getElementById("btn-new-note");
  const btnSave = document.getElementById("btn-save-note");
  const btnDownload = document.getElementById("btn-download-note");
  const btnDelete = document.getElementById("btn-delete-note");
  const searchInput = document.getElementById("notes-search");

  let files = JSON.parse(localStorage.getItem("nxt_user_files") || "[]");
  if (files.length === 0) {
    files = [
      {
        id: "f-1",
        title: "Welcome_to_NXT_OS.txt",
        content: "NXT OS Cyberpunk Terminal HUD\n================================\n\nFeatures:\n- Real-time Global Chat Room\n- Notes & Files Editor\n- Unblocked Apps & Scramjet Proxy\n- Cyberpunk Interactive Terminal\n\nEnjoy using NXT OS!"
      }
    ];
    localStorage.setItem("nxt_user_files", JSON.stringify(files));
  }

  let activeFileId = files[0].id;

  function renderNotesList() {
    if (!notesListEl) return;
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const visibleFiles = files.filter((file) => file.title.toLowerCase().includes(query));
    notesListEl.innerHTML = visibleFiles.map(f => `
      <div class="note-item ${f.id === activeFileId ? "active" : ""}" data-id="${f.id}">
        📄 ${escapeHtml(f.title)}
      </div>
    `).join("");

    notesListEl.querySelectorAll(".note-item").forEach(item => {
      item.addEventListener("click", () => {
        activeFileId = item.dataset.id;
        loadActiveFile();
        renderNotesList();
      });
    });
  }

  function loadActiveFile() {
    const file = files.find(f => f.id === activeFileId);
    if (file) {
      if (titleInput) titleInput.value = file.title;
      if (contentArea) contentArea.value = file.content;
    }
  }

  function saveActiveFile() {
    const file = files.find(f => f.id === activeFileId);
    if (file) {
      file.title = titleInput.value.trim() || "Untitled.txt";
      file.content = contentArea.value;
      localStorage.setItem("nxt_user_files", JSON.stringify(files));
      renderNotesList();
      logActivity("FILE_SAVE", "NXT OS User", "Saved File", file.title);
    }
  }

  if (btnNew) {
    btnNew.addEventListener("click", () => {
      const newFile = {
        id: "f-" + Math.random().toString(36).substring(2, 9),
        title: "New_Document_" + (files.length + 1) + ".txt",
        content: ""
      };
      files.push(newFile);
      activeFileId = newFile.id;
      localStorage.setItem("nxt_user_files", JSON.stringify(files));
      renderNotesList();
      loadActiveFile();
    });
  }

  if (btnSave) btnSave.addEventListener("click", saveActiveFile);
  if (searchInput) searchInput.addEventListener("input", renderNotesList);
  if (contentArea) contentArea.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveActiveFile();
    }
  });

  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      const file = files.find(f => f.id === activeFileId);
      if (!file) return;
      saveActiveFile();
      const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.title;
      a.click();
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", () => {
      if (files.length <= 1) return;
      files = files.filter(f => f.id !== activeFileId);
      activeFileId = files[0].id;
      localStorage.setItem("nxt_user_files", JSON.stringify(files));
      renderNotesList();
      loadActiveFile();
    });
  }

  renderNotesList();
  loadActiveFile();
}

// ── 🎮 Apps Hub Launchers ────────────────────────────────────────────────────
function initAppsHub() {
  const btnLaunchProxy = document.getElementById("app-launch-proxy");

  if (btnLaunchProxy) btnLaunchProxy.addEventListener("click", () => openApp("browser"));
}

// ── 💻 Cyber Terminal Console ────────────────────────────────────────────────
function initTerminalConsole() {
  const form = document.getElementById("term-form");
  const input = document.getElementById("term-input");
  const logs = document.getElementById("term-logs");
  const zshForm = document.getElementById("zsh-form");
  const zshInput = document.getElementById("zsh-input");
  const zshLogs = document.getElementById("zsh-logs");
  let zshCwd = null;
  let zshHistory = [];
  let zshHistoryIndex = -1;
  const zshCwdLabel = document.getElementById("zsh-cwd");

  document.querySelectorAll(".terminal-session").forEach((session) => {
    session.addEventListener("click", () => {
      const target = session.dataset.terminalSession;
      document.querySelectorAll(".terminal-session").forEach((item) => {
        item.classList.toggle("active", item === session);
      });
      document.querySelectorAll(".terminal-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.terminalPanel === target);
      });
      const targetInput = target === "zsh" ? zshInput : input;
      if (targetInput) targetInput.focus();
    });
  });

  function logTerm(line, type = "out") {
    if (!logs) return;
    const div = document.createElement("div");
    div.className = "term-line " + (type === "cmd" ? "cmd" : (type === "err" ? "err" : ""));
    div.textContent = line;
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;
  }

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const cmd = input.value.trim();
      if (!cmd) return;
      input.value = "";

      logTerm("nxt@os:~$ " + cmd, "cmd");
      executeCommand(cmd);
    });
  }

  function executeCommand(cmd) {
    const action = cmd.split(/\s+/)[0].toLowerCase();

    switch (action) {
      case "help":
        logTerm("Available Commands:");
        logTerm("  chat       - Open NXT Global Chat");
        logTerm("  notes      - Open Notes & Files System");
        logTerm("  apps       - Open NXT Apps");
        logTerm("  proxy      - Open Scramjet Web Proxy");
        logTerm("  clear      - Clear terminal logs");
        logTerm("  ping       - Ping NXT telemetry core");
        logTerm("  date       - Show current system timestamp");
        logTerm("  pwd        - Show the NXT project directory");
        logTerm("  zsh        - Run a local zsh command");
        logTerm("  panic      - Emergency exit to Google");
        break;

      case "chat":
        openApp("chat");
        logTerm("Opened NXT Chat Room.");
        break;

      case "notes":
        openApp("notes");
        logTerm("Opened Notes & Files System.");
        break;

      case "apps":
        openApp("apps");
        logTerm("Opened NXT Apps.");
        break;

      case "proxy":
        openApp("browser");
        logTerm("Opened Scramjet Proxy.");
        break;

      case "clear":
        if (logs) logs.innerHTML = "";
        break;

      case "ping":
        logTerm("Pinging telemetry core... 200 OK (0.8ms)");
        break;

      case "date":
        logTerm("System Date: " + new Date().toString());
        break;

      case "zsh":
        document.querySelector('[data-terminal-session="zsh"]')?.click();
        logTerm("Switched to zsh. Commands now run in the local shell.");
        break;

      case "panic":
        window.location.replace("https://www.google.com");
        break;

      default:
        logTerm("Unknown Cyber Console command: '" + cmd + "'. Type 'help'.", "err");
    }
  }

  if (zshForm && zshInput) {
    zshInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        zshHistoryIndex = Math.min(zshHistoryIndex + 1, zshHistory.length - 1);
        zshInput.value = zshHistory[zshHistory.length - 1 - zshHistoryIndex] || zshInput.value;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        zshHistoryIndex = Math.max(zshHistoryIndex - 1, -1);
        zshInput.value = zshHistoryIndex < 0 ? "" : zshHistory[zshHistory.length - 1 - zshHistoryIndex];
      }
      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        zshLogs.innerHTML = "";
      }
    });

    zshForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const cmd = zshInput.value.trim();
      if (!cmd) return;
      zshInput.value = "";
      zshHistory.push(cmd);
      zshHistoryIndex = -1;
      logTermTo(zshLogs, "zsh % " + cmd, "cmd");
      runShellCommand(cmd, zshLogs, zshInput);
    });
  }

  async function runShellCommand(cmd, outputLogs, commandInput) {
    if (!commandInput) return;
    commandInput.disabled = true;

    try {
      const response = await fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, cwd: zshCwd })
      });
      const result = await response.json();

      if (!response.ok) {
        logTermTo(outputLogs, result.error || "Terminal request failed.", "err");
        return;
      }

      if (result.output) logTermTo(outputLogs, result.output.trimEnd());
      if (result.errorOutput) logTermTo(outputLogs, result.errorOutput.trimEnd(), "err");
      if (result.timedOut) logTermTo(outputLogs, "Command timed out after 10 seconds.", "err");
      if (result.exitCode !== 0 && !result.timedOut) {
        logTermTo(outputLogs, "zsh: exit " + result.exitCode, "err");
      }
      if (result.cwd) zshCwd = result.cwd;
      if (result.cwd && zshCwdLabel) zshCwdLabel.textContent = result.cwd.split("/").pop() || "/";
    } catch (error) {
      logTermTo(outputLogs, "Unable to reach the local shell.", "err");
    } finally {
      commandInput.disabled = false;
      commandInput.focus();
    }
  }

  function logTermTo(targetLogs, line, type = "out") {
    if (!targetLogs) return;
    const div = document.createElement("div");
    div.className = "term-line " + (type === "cmd" ? "cmd" : (type === "err" ? "err" : ""));
    div.textContent = line;
    targetLogs.appendChild(div);
    targetLogs.scrollTop = targetLogs.scrollHeight;
  }
}

// ── ⚙️ Settings & Background Switcher ────────────────────────────────────────
function initSettings() {
  const btnParticles = document.getElementById("bg-opt-particles");
  const btnGrid = document.getElementById("bg-opt-grid");
  const btnDark = document.getElementById("bg-opt-dark");
  const desktop = document.getElementById("os-desktop");
  const resetWorkspace = document.getElementById("workspace-reset");
  const focusWorkspace = document.getElementById("workspace-focus");

  if (btnParticles) {
    btnParticles.addEventListener("click", () => {
      if (desktop) desktop.style.background = "";
    });
  }

  if (btnGrid) {
    btnGrid.addEventListener("click", () => {
      if (desktop) {
        desktop.style.background = `
          radial-gradient(circle at 50% 50%, rgba(34,197,94,0.1), transparent 70%),
          linear-gradient(to right, rgba(34,197,94,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(34,197,94,0.06) 1px, transparent 1px)
        `;
        desktop.style.backgroundSize = "100% 100%, 30px 30px, 30px 30px";
      }
    });
  }

  if (btnDark) {
    btnDark.addEventListener("click", () => {
      if (desktop) desktop.style.background = "#020403";
    });
  }

  if (resetWorkspace) {
    resetWorkspace.addEventListener("click", () => {
      document.querySelectorAll(".win-shell").forEach((win) => closeApp(win.id.replace("win-", "")));
      openApp("chat");
    });
  }

  if (focusWorkspace) {
    focusWorkspace.addEventListener("click", () => {
      const chat = document.getElementById("win-chat");
      if (chat) bringToFront(chat);
    });
  }
}

// ── Clock & Topbar Exit ───────────────────────────────────────────────────────
function initClockAndExit() {
  const clockEl = document.getElementById("os-clock");
  const exitBtn = document.getElementById("os-exit-btn");

  bindSignOutButtons("#os-logout-btn");

  function updateClock() {
    if (clockEl) {
      const d = new Date();
      clockEl.textContent = d.toLocaleTimeString([], { hour12: false });
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  if (exitBtn) {
    exitBtn.addEventListener("click", () => {
      window.location.href = "user.html";
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.location.replace("https://www.google.com");
    }
  });
}

// ── Particle Background Canvas Loop ──────────────────────────────────────────
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

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},80%,55%,${p.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(render);
  }
  render();
})();

// ── Helper ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Init All Systems ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initDraggableWindows();
  setupLaunchers();
  initAppTabs();
  initChatSystem();
  initNotesSystem();
  initAppsHub();
  initTerminalConsole();
  initSettings();
  initClockAndExit();

  // Default open Chat and Apps Hub on boot
  openApp("chat");
});
