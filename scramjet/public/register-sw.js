"use strict";
/** Root-scoped SW so /scramjet/ proxied traffic is intercepted (UI lives under /proxy/). */
const stockSW = "/sw.js";
const stockSWScope = "/";

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used in 404.html and index.html
 */
async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers cannot be registered without https.");

		throw new Error("Your browser doesn't support service workers.");
	}

	const registrations = await navigator.serviceWorker.getRegistrations();
	for (const registration of registrations) {
		if (registration.scope.includes("/scramjet/")) {
			await registration.unregister();
		}
	}

	await navigator.serviceWorker.register(stockSW, { scope: stockSWScope });
}
