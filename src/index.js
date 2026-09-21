import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";

import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const rootPath = fileURLToPath(new URL("../../", import.meta.url));
const proxyPath = fileURLToPath(new URL("../../proxy/", import.meta.url));

logging.set_level(logging.NONE);

Object.assign(wisp.options, {
  allow_udp_streams: false,
  dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
  logger: true,

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

/*
 * Scramjet files
 */
fastify.register(fastifyStatic, {
  root: scramjetPath,
  prefix: "/scram/",
  decorateReply: false,
});

/*
 * Libcurl transport
 */
fastify.register(fastifyStatic, {
  root: libcurlPath,
  prefix: "/libcurl/",
  decorateReply: false,
});

/*
 * BareMux
 */
fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/baremux/",
  decorateReply: false,
});

/*
 * NXT proxy UI
 *
 * Files live in:
 *
 * /proxy/index.html
 * /proxy/index.js
 * /proxy/sw.js
 */
fastify.register(fastifyStatic, {
  root: proxyPath,
  prefix: "/proxy/",
  decorateReply: false,
});

/*
 * Service worker MUST be at:
 *
 * https://your-domain.com/sw.js
 */
fastify.get("/sw.js", async (_request, reply) => {
  return reply
    .type("application/javascript")
    .sendFile("sw.js", proxyPath);
});

/*
 * /proxy → /proxy/
 */
fastify.get("/proxy", async (_request, reply) => {
  return reply.redirect("/proxy/");
});

/*
 * Legacy Scramjet routes
 */
fastify.get("/scramjet", async (_request, reply) => {
  return reply.redirect("/proxy/");
});

fastify.get("/scramjet/", async (_request, reply) => {
  return reply.redirect("/proxy/");
});

/*
 * Main NXT website
 */
fastify.register(fastifyStatic, {
  root: rootPath,
  decorateReply: true,
});

/*
 * 404
 */
fastify.setNotFoundHandler(async (_request, reply) => {
  return reply
    .code(404)
    .type("text/plain")
    .send("NXT: Page not found");
});

/*
 * Start server
 */
let port = Number(process.env.PORT);

if (!port) {
  port = 8080;
}

fastify.listen({
  port,
  host: "0.0.0.0",
});

fastify.server.on("listening", () => {
  const address = fastify.server.address();

  console.log("NXT Browser server started");

  if (typeof address === "object" && address) {
    console.log(`Port: ${address.port}`);
  }

  console.log(`Proxy: /proxy/`);
  console.log(`Service Worker: /sw.js`);
  console.log(`Wisp: /wisp/`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
  console.log("Shutting down...");
  await fastify.close();
  process.exit(0);
}
