import express from 'express';
import { createServer } from 'http';
import path from 'path';
import os from 'os';
import { Server, type Socket } from 'socket.io';
import { PORT, clientOrigins, isProduction, usingEmulators } from './env.js';
import { adminConfigured, verifyIdToken } from './firebaseAdmin.js';
import { MatchStore } from './matchStore.js';
import { registerGameHandlers } from './gameHandlers.js';
import { getLeaderboard, getProfile, getRecentMatches } from './persistence.js';

/**
 * Server entry point. Serves the built SPA and hosts the authoritative game.
 */

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

export async function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const store = new MatchStore();

  app.use(express.json({ limit: '32kb' }));

  const io = new Server(httpServer, {
    // In development any origin is allowed so a phone on the same Wi-Fi can
    // connect. In production only the configured origins may open a socket.
    cors: {
      origin: isProduction && clientOrigins.length > 0 ? clientOrigins : true,
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // -----------------------------------------------------------------
  // Handshake authentication — the only place a uid enters the system
  // -----------------------------------------------------------------
  io.use(async (socket: Socket, next) => {
    if (!adminConfigured) {
      // Refuse rather than fall back to trusting a client-supplied id. A
      // misconfigured server must not silently become an unauthenticated one.
      next(new Error('AUTH_UNAVAILABLE'));
      return;
    }
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof token !== 'string' || !token) {
      next(new Error('AUTH_REQUIRED'));
      return;
    }
    try {
      socket.data.user = await verifyIdToken(token);
      next();
    } catch {
      next(new Error('AUTH_INVALID'));
    }
  });

  registerGameHandlers(io, store);

  // -----------------------------------------------------------------
  // HTTP API
  // -----------------------------------------------------------------
  app.get('/healthz', (_req, res) => {
    res.json({
      status: 'ok',
      activeMatches: store.size,
      authConfigured: adminConfigured,
      emulators: usingEmulators,
    });
  });

  /** Bearer-token guard for the read-only REST endpoints. */
  async function requireUser(req: express.Request, res: express.Response) {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!adminConfigured || !token) {
      res.status(401).json({ error: 'Authentication required.' });
      return null;
    }
    try {
      return await verifyIdToken(token);
    } catch {
      res.status(401).json({ error: 'Authentication required.' });
      return null;
    }
  }

  app.get('/api/me', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const [profile, recent] = await Promise.all([getProfile(user.uid), getRecentMatches(user.uid)]);
    res.json({ uid: user.uid, name: user.name, photoURL: user.picture, profile, recent });
  });

  app.get('/api/leaderboard', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ rows: await getLeaderboard() });
  });

  // -----------------------------------------------------------------
  // Static assets / dev middleware
  // -----------------------------------------------------------------
  if (isProduction) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  return { app, httpServer, io, store };
}

async function main() {
  const { httpServer } = await createApp();

  if (!adminConfigured) {
    console.warn(
      '\n[server] Firebase Admin is not configured. Sockets will refuse connections.\n' +
        '         Set FIREBASE_SERVICE_ACCOUNT, or run the Firebase emulators for local development.\n',
    );
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\nServer listening on http://localhost:${PORT}`);
    if (!isProduction) {
      for (const ip of lanAddresses()) {
        console.log(`  LAN: http://${ip}:${PORT}`);
      }
    }
  });
}

// Only auto-start when run directly; tests import `createApp` instead.
if (process.env.VITEST !== 'true') {
  void main();
}
