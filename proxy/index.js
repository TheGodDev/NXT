"use strict";

import { bindSignOutButtons, requireSignedIn, signOutOnPageExit } from "../auth.js";

bindSignOutButtons(".proxy-logout");
requireSignedIn();
signOutOnPageExit();

function initNxtBackground() {
	const canvas = document.getElementById("nxt-bg-canvas");
	if (!canvas) return;
	const context = canvas.getContext("2d");
	const particles = Array.from({ length: 55 }, () => ({
		x: Math.random() * window.innerWidth,
		y: Math.random() * window.innerHeight,
		radius: 1 + Math.random() * 2.2,
		dx: (Math.random() - 0.5) * 0.38,
		dy: (Math.random() - 0.5) * 0.38,
		alpha: 0.18 + Math.random() * 0.45
	}));

	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	function render() {
		context.clearRect(0, 0, canvas.width, canvas.height);
		particles.forEach((particle) => {
			particle.x += particle.dx;
			particle.y += particle.dy;
			if (particle.x < 0) particle.x = canvas.width;
			if (particle.x > canvas.width) particle.x = 0;
			if (particle.y < 0) particle.y = canvas.height;
			if (particle.y > canvas.height) particle.y = 0;
			context.beginPath();
			context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
			context.fillStyle = `hsla(130, 80%, 55%, ${particle.alpha})`;
			context.fill();
		});
		requestAnimationFrame(render);
	}

	resize();
	window.addEventListener("resize", resize);
	render();
}

initNxtBackground();

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
	window.browserUI.addressBar.value = url;
	await window.browserUI.navigate();
});
