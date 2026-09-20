import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBareServer } from '@mercuryworkshop/wisp-js/server'; // If utilizing Wisp protocols
import { scramjetPath } from '@mercuryworkshop/scramjet/path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });
const port = Number(process.env.PORT) || 10000;

// 1. Serve main website portal files (HTML, CSS, JS) from root workspace
fastify.register(fastifyStatic, {
  root: __dirname,
  prefix: '/',
  wildcard: false // Prevents overlapping with proxy routes
});

// 2. Automatically serve Scramjet's internal distribution assets under /scram/
fastify.register(fastifyStatic, {
  root: scramjetPath,
  prefix: '/scram/',
  decorateReply: false
});

// 3. Serve the dedicated proxy dashboard files from /proxy/
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'proxy'),
  prefix: '/proxy/',
  decorateReply: false
});

// 4. Fallback route routing to support SPA indexing configuration
fastify.setNotFoundHandler((request, reply) => {
  reply.sendFile('index.html');
});

// 5. Start the network cluster listening on Render default interface
const start = async () => {
  try {
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`🚀 NXT Portal & Scramjet active at http://0.0.0:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
