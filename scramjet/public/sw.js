importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

function isLegacyShellNavigation(request) {
	if (request.mode !== "navigate") return false;
	const pathname = new URL(request.url).pathname;
	return pathname === "/scramjet" || pathname === "/scramjet/";
}

async function handleRequest(event) {
	if (isLegacyShellNavigation(event.request)) {
		return Response.redirect(new URL("/proxy/", event.request.url), 302);
	}

	await scramjet.loadConfig();
	if (scramjet.route(event)) {
		return scramjet.fetch(event);
	}
	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
