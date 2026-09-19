"use strict";

/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

window.scramjet = scramjet;

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

async function ensureProxyReady() {
	await registerSW();

	const wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";

	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
	}
}

window.ensureProxyReady = ensureProxyReady;

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	error.textContent = "";
	errorCode.textContent = "";

	try {
		await ensureProxyReady();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	const url = search(address.value, searchEngine.value);
	sendTelemetryEvent("SEARCH", "Proxy Search", url);
	window.browserUI.addressBar.value = url;
	await window.browserUI.navigate();
});

// ── Active Telemetry Emissions ────────────────────────────────────────────────
const sessionId = "sess_" + Math.random().toString(36).substring(2, 10);

function sendHeartbeat() {
	fetch("/api/telemetry/heartbeat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sessionId, user: "Active Proxy User", page: "Proxy" })
	}).catch(() => {});
}
sendHeartbeat();
setInterval(sendHeartbeat, 4000);

function sendTelemetryEvent(type, action, detail) {
	fetch("/api/telemetry/event", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ type, user: "Proxy User", action, detail })
	}).catch(() => {});
}

// ── Panic button & Escape key exit ───────────────────────────────────────────
function triggerPanic() {
	window.location.replace("https://www.google.com");
}

const panicBtn = document.getElementById("panic-btn");
if (panicBtn) {
	panicBtn.addEventListener("click", triggerPanic);
}

window.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		triggerPanic();
	}
});

// ── NXT Canvas Background Animation ─────────────────────────────────────────
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

	function render() {
		t += 0.016;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawOrbs();

		for (const p of particles) {
			p.x += p.dx;
			p.y += p.dy;

			if (p.x < 0) p.x = canvas.width;
			if (p.x > canvas.width) p.x = 0;
			if (p.y < 0) p.y = canvas.height;
			if (p.y > canvas.height) p.y = 0;

			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.alpha})`;
			ctx.shadowBlur = 8;
			ctx.shadowColor = `hsla(${p.hue}, 80%, 50%, 0.6)`;
			ctx.fill();
		}

		requestAnimationFrame(render);
	}
	render();
})();

