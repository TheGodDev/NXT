import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const portalPath = fileURLToPath(new URL("../../", import.meta.url));
const scramjetPublicPath = fileURLToPath(new URL("../public/", import.meta.url));

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				const path = req.url?.split("?")[0] ?? "";
				if (path === "/wisp/" || path.endsWith("/wisp/")) {
					wisp.routeRequest(req, socket, head);
				} else {
					socket.end();
				}
			});
	},
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: scramjetPublicPath,
	prefix: "/proxy/",
	decorateReply: false,
});

// ── In-Memory Telemetry Engine for Admin Live Monitor ───────────────────────
const activeSessions = new Map();
const activityLogs = [
	{
		id: "sys-0",
		type: "SYSTEM",
		user: "NXT Core",
		action: "Telemetry Engine Online",
		detail: "Monitoring active connections & proxy traffic",
		timestamp: new Date().toLocaleTimeString()
	}
];

// ── Live Global Chat Room Storage ───────────────────────────────────────────
const chatMessages = [
	{
		id: "c-0",
		user: "NXT System",
		message: "Welcome to NXT OS Global Chat. Pick a username and start chatting.",
		timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
		isSystem: true
	}
];

fastify.get("/api/chat/messages", async (_request, reply) => {
	return reply.send({ messages: chatMessages.slice(-60) });
});

fastify.post("/api/chat/send", async (request, reply) => {
	const body = request.body || {};
	const user = (body.user || "Anonymous").trim().substring(0, 24);
	const message = (body.message || "").trim().substring(0, 350);

	if (!user || !message) {
		return reply.code(400).send({ error: "Username and message required" });
	}

	const newMsg = {
		id: "c-" + Math.random().toString(36).substring(2, 9),
		user,
		message,
		timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
	};

	chatMessages.push(newMsg);
	if (chatMessages.length > 150) chatMessages.shift();

	activityLogs.unshift({
		id: newMsg.id,
		type: "CHAT",
		user: newMsg.user,
		action: "NXT Chat",
		detail: newMsg.message,
		timestamp: newMsg.timestamp
	});

	return reply.send({ success: true, message: newMsg });
});

fastify.get("/sw.js", async (_request, reply) => {
	return reply.sendFile("sw.js", scramjetPublicPath);
});

fastify.get("/proxy", async (_request, reply) => {
	return reply.redirect("/proxy/");
});

fastify.get("/scramjet", async (_request, reply) => {
	return reply.redirect("/proxy/");
});

fastify.get("/scramjet/", async (_request, reply) => {
	return reply.redirect("/proxy/");
});

fastify.register(fastifyStatic, {
	root: portalPath,
	decorateReply: true,
});

fastify.setNotFoundHandler((_request, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html", scramjetPublicPath);
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	console.log("NXT portal and Scramjet proxy listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(`\tProxy UI: http://localhost:${address.port}/proxy/`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "", 10);

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});
