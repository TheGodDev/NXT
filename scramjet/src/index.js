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

fastify.post("/api/telemetry/heartbeat", async (request, reply) => {
	const body = request.body || {};
	const sessionId = body.sessionId || request.ip;
	if (sessionId) {
		activeSessions.set(sessionId, {
			sessionId,
			user: body.user || "Anonymous User",
			page: body.page || "portal",
			lastSeen: Date.now(),
			ip: request.ip || "127.0.0.1"
		});
	}
	return reply.send({ success: true });
});

fastify.post("/api/telemetry/event", async (request, reply) => {
	const body = request.body || {};
	const logEntry = {
		id: Math.random().toString(36).substring(2, 9),
		type: body.type || "SEARCH",
		user: body.user || "User",
		action: body.action || "Proxy Search",
		detail: body.detail || "",
		timestamp: new Date().toLocaleTimeString()
	};
	activityLogs.unshift(logEntry);
	if (activityLogs.length > 100) activityLogs.pop();
	return reply.send({ success: true, logEntry });
});

fastify.get("/api/telemetry/stats", async (_request, reply) => {
	const now = Date.now();
	for (const [id, session] of activeSessions.entries()) {
		if (now - session.lastSeen > 12000) {
			activeSessions.delete(id);
		}
	}
	return reply.send({
		onlineCount: activeSessions.size,
		sessions: Array.from(activeSessions.values()),
		recentLogs: activityLogs.slice(0, 30)
	});
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
