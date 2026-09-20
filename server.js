const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const rootDir = __dirname;
const port = Number(process.env.PORT) || 8080;
const scramjetDir = path.join(rootDir, 'scramjet', 'node_modules', '@mercuryworkshop');
const { server: wisp, logging } = require(path.join(scramjetDir, 'wisp-js', 'dist', 'wisp-server.cjs'));

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  dns_servers: ['1.1.1.3', '1.0.0.3']
});

const chatMessages = [
  {
    id: 'c-0',
    user: 'NXT System',
    message: 'Welcome to NXT OS Global Chat. Pick a username and start chatting.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function isLocalRequest(req) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
}

function runTerminalCommand(req, res) {
  if (!isLocalRequest(req)) {
    sendJson(res, { error: 'Terminal access is limited to localhost.' }, 403);
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
    if (rawBody.length > 12000) req.destroy();
  });
  req.on('end', () => {
    try {
      const body = rawBody ? JSON.parse(rawBody) : {};
      const command = String(body.command || '').trim();
      const requestedCwd = String(body.cwd || rootDir);
      const cwd = path.resolve(requestedCwd);

      if (!command) {
        sendJson(res, { error: 'A command is required.' }, 400);
        return;
      }

      if (command.length > 2000) {
        sendJson(res, { error: 'Command is limited to 2,000 characters.' }, 400);
        return;
      }

      if (!cwd.startsWith(rootDir) || !fs.existsSync(cwd)) {
        sendJson(res, { error: 'Working directory must remain inside the NXT project.' }, 400);
        return;
      }

      const wrappedCommand = `${command}\nprintf "\\n__NXT_CWD__%s\\n" "$PWD"`;
      exec(wrappedCommand, {
        cwd,
        shell: '/bin/zsh',
        timeout: 10000,
        maxBuffer: 64 * 1024,
        env: { ...process.env, TERM: 'xterm-256color' }
      }, (error, stdout, stderr) => {
        const cwdMarker = '\n__NXT_CWD__';
        const markerIndex = stdout.lastIndexOf(cwdMarker);
        const nextCwd = markerIndex >= 0 ? stdout.slice(markerIndex + cwdMarker.length).trim() : cwd;
        const output = markerIndex >= 0 ? stdout.slice(0, markerIndex) : stdout;
        sendJson(res, {
          output,
          errorOutput: stderr,
          cwd: nextCwd,
          exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
          timedOut: Boolean(error && error.killed)
        });
      });
    } catch (error) {
      sendJson(res, { error: 'Invalid terminal request.' }, 400);
    }
  });
}

function resolveScramjetAsset(pathname) {
  const assetMap = {
    '/scram/scramjet.all.js': path.join(scramjetDir, 'scramjet', 'dist', 'scramjet.all.js'),
    '/scram/scramjet.sync.js': path.join(scramjetDir, 'scramjet', 'dist', 'scramjet.sync.js'),
    '/scram/scramjet.wasm.wasm': path.join(scramjetDir, 'scramjet', 'dist', 'scramjet.wasm.wasm'),
    '/baremux/index.js': path.join(scramjetDir, 'bare-mux', 'dist', 'index.js'),
    '/baremux/worker.js': path.join(scramjetDir, 'bare-mux', 'dist', 'worker.js'),
    '/libcurl/index.mjs': path.join(scramjetDir, 'libcurl-transport', 'dist', 'index.mjs')
  };

  if (assetMap[pathname]) return assetMap[pathname];

  if (pathname.startsWith('/scram/')) {
    const fileName = pathname.slice('/scram/'.length);
    return path.join(scramjetDir, 'scramjet', 'dist', fileName);
  }

  if (pathname.startsWith('/baremux/')) {
    const fileName = pathname.slice('/baremux/'.length);
    return path.join(scramjetDir, 'bare-mux', 'dist', fileName);
  }

  if (pathname.startsWith('/libcurl/')) {
    const fileName = pathname.slice('/libcurl/'.length);
    return path.join(scramjetDir, 'libcurl-transport', 'dist', fileName);
  }

  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/') pathname = '/index.html';

  if (pathname === '/api/chat/messages' && req.method === 'GET') {
    sendJson(res, { messages: chatMessages.slice(-60) });
    return;
  }

  if (pathname === '/api/chat/send' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });
    req.on('end', () => {
      try {
        const body = rawBody ? JSON.parse(rawBody) : {};
        const user = String(body.user || 'Anonymous').trim().substring(0, 24);
        const message = String(body.message || '').trim().substring(0, 350);

        if (!user || !message) {
          sendJson(res, { error: 'Username and message required' }, 400);
          return;
        }

        const newMsg = {
          id: 'c-' + Math.random().toString(36).slice(2, 9),
          user,
          message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        chatMessages.push(newMsg);
        if (chatMessages.length > 150) chatMessages.shift();

        sendJson(res, { success: true, message: newMsg });
      } catch (error) {
        sendJson(res, { error: 'Invalid JSON payload' }, 400);
      }
    });
    return;
  }

  if (pathname === '/api/terminal/exec' && req.method === 'POST') {
    runTerminalCommand(req, res);
    return;
  }

  const scramjetAsset = resolveScramjetAsset(pathname);
  if (scramjetAsset) {
    const safePath = path.normalize(scramjetAsset);
    if (safePath.startsWith(scramjetDir)) {
      serveFile(safePath, res);
      return;
    }
  }

  const safePath = path.normalize(pathname).replace(/^\/+/, '');
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (
        pathname === '/proxy/' ||
        pathname === '/proxy' ||
        pathname === '/scramjet/' ||
        pathname === '/scramjet'
      ) {
        const proxyIndex = path.join(rootDir, 'proxy', 'index.html');
        serveFile(proxyIndex, res);
        return;
      }

      if (pathname === '/sw.js') {
        const swPath = path.join(rootDir, 'proxy', 'sw.js');
        serveFile(swPath, res);
        return;
      }

      if (pathname === '/os.html' || pathname === '/user.html' || pathname === '/index.html') {
        serveFile(path.join(rootDir, pathname.slice(1)), res);
        return;
      }

      const fallback = path.join(rootDir, 'index.html');
      serveFile(fallback, res);
      return;
    }

    serveFile(filePath, res);
  });
});

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/wisp/' || pathname.endsWith('/wisp/')) {
    wisp.routeRequest(req, socket, head);
    return;
  }

  socket.end();
});

server.listen(port, '0.0.0.0', () => {
  console.log(`NXT portal running on http://localhost:${port}`);
  console.log(`Proxy UI: http://localhost:${port}/proxy/`);
});
