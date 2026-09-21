import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const rootPath = fileURLToPath(new URL("../", import.meta.url));
const proxyPath = fileURLToPath(new URL("../proxy/", import.meta.url));

logging.set_level(logging.NONE);

Object.assign(wisp.options, {
  allow_udp_streams: false,
  hostname_blacklist: [/example\.com/],
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
        if (req.url?.endsWith("/wisp/")) {
          wisp.routeRequest(req, socket, head);
        } else {
          socket.end();
        }
      });
  },
});

// LCPS GO files
fastify.register(fastifyStatic, {
  root: rootPath,
  decorateReply: true,
  index: false,
});

// Proxy UI
fastify.register(fastifyStatic, {
  root: proxyPath,
  prefix: "/proxy/",
  decorateReply: false,
});

// Scramjet runtime
fastify.register(fastifyStatic, {
  root: scramjetPath,
  prefix: "/scram/",
  decorateReply: false,
});

// Libcurl
fastify.register(fastifyStatic, {
  root: libcurlPath,
  prefix: "/libcurl/",
  decorateReply: false,
});

// Baremux
fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/baremux/",
  decorateReply: false,
});

// LCPS GO homepage
fastify.get("/", async (request, reply) => {
  return reply.sendFile("index.html", rootPath);
});

// Proxy homepage
fastify.get("/proxy", async (request, reply) => {
  return reply.redirect("/proxy/");
});

fastify.get("/proxy/", async (request, reply) => {
  return reply.sendFile("index.html", proxyPath);
});

// Old URL still works
fastify.get("/scramjet", async (request, reply) => {
  return reply.redirect("/proxy/");
});

fastify.get("/scramjet/", async (request, reply) => {
  return reply.redirect("/proxy/");
});

// --- SERVE SERVICE WORKER FILES FROM PROXY ROUTED AT THE ROOT ---
fastify.get("/sw.js", async (request, reply) => {
  return reply
    .type("application/javascript")
    .sendFile("sw.js", proxyPath);
});

// Adding this just in case your setup uses a secondary worker bundle file
fastify.get("/sw.worker.js", async (request, reply) => {
  return reply
    .type("application/javascript")
    .sendFile("sw.worker.js", proxyPath);
});
// ----------------------------------------------------------------

fastify.setNotFoundHandler((request, reply) => {
  return reply.code(404).type("text/html").send("Not found");
});

fastify.server.on("listening", () => {
  const address = fastify.server.address();

  console.log("NXT listening on:");
  console.log(`http://localhost:${address.port}`);
  console.log(`Proxy: http://localhost:${address.port}/proxy/`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("Closing server...");
  fastify.close();
  process.exit(0);
}

let port = parseInt(process.env.PORT || "", 10);

if (isNaN(port)) {
  port = 8080;
}

fastify.listen({
  port,
  host: "0.0.0.0",
});
