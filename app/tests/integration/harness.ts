import type { AddressInfo } from 'net';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../../server/index.js';

/**
 * Integration harness: a real HTTP server, a real socket.io server, real
 * socket.io clients, and real Firebase ID tokens minted by the Auth emulator.
 *
 * Nothing here is mocked, so these tests genuinely exercise the handshake
 * verification and authorization paths rather than a stand-in for them.
 */

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'localhost:9099';

export interface TestUser {
  uid: string;
  email: string;
  token: string;
}

let userCounter = 0;

/**
 * Create a user in the Auth emulator and return a usable ID token.
 * The emulator accepts any API key, so a placeholder is fine.
 */
export async function createTestUser(displayName?: string): Promise<TestUser> {
  const email = `player${++userCounter}-${Date.now()}@example.test`;
  const password = 'test-password-123';

  const signUp = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!signUp.ok) {
    throw new Error(`Auth emulator signUp failed: ${signUp.status} ${await signUp.text()}`);
  }
  const created = (await signUp.json()) as { idToken: string; localId: string };

  if (displayName) {
    const update = await fetch(
      `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: created.idToken, displayName, returnSecureToken: true }),
      },
    );
    if (update.ok) {
      const updated = (await update.json()) as { idToken?: string };
      if (updated.idToken) return { uid: created.localId, email, token: updated.idToken };
    }
  }

  return { uid: created.localId, email, token: created.idToken };
}

export interface Harness {
  port: number;
  connect(user: TestUser): Promise<ClientSocket>;
  connectRaw(auth: Record<string, unknown>): Promise<ClientSocket>;
  close(): Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const { httpServer, io } = await createApp();
  await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const port = (httpServer.address() as AddressInfo).port;

  const clients: ClientSocket[] = [];

  function open(auth: Record<string, unknown>): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = createClient(`http://127.0.0.1:${port}`, {
        auth,
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      clients.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', err => reject(err));
    });
  }

  return {
    port,
    connect: (user: TestUser) => open({ token: user.token }),
    connectRaw: open,
    async close() {
      for (const c of clients) c.disconnect();
      io.close();
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    },
  };
}

/** Await a single named event, rejecting if it does not arrive in time. */
export function waitFor<T = unknown>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, timeoutMs);
    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

/** Assert an event does NOT arrive within the window. */
export async function expectNoEvent(
  socket: ClientSocket,
  event: string,
  windowMs = 600,
): Promise<void> {
  let fired = false;
  const handler = () => {
    fired = true;
  };
  socket.on(event, handler);
  await new Promise(resolve => setTimeout(resolve, windowMs));
  socket.off(event, handler);
  if (fired) throw new Error(`Expected no "${event}", but it fired`);
}

/** Promisified emit-with-acknowledgement. */
export function emitAck<T = unknown>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Ack timeout for "${event}"`)), timeoutMs);
    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

export interface MatchView {
  id: string;
  mode: 'pvp' | 'bot';
  status: 'waiting' | 'active' | 'finished';
  role: 'X' | 'O' | 'spectator';
  state: {
    currentPlayer: 'X' | 'O';
    winner: 'X' | 'O' | 'Draw' | null;
    nextRequiredSubBoard: number | null;
    superBoard: (string | null)[][];
    subBoardWinners: (string | null)[];
    moves: unknown[];
  };
  players: {
    X: { uid: string; name: string; connected: boolean } | null;
    O: { uid: string; name: string; connected: boolean } | null;
  };
  result: { winner: string; reason: string } | null;
  drawOfferedBy: 'X' | 'O' | null;
  rematchRequestedBy: string[];
  rematchMatchId: string | null;
}

export type AckOk = { ok: true; match: MatchView };
export type AckErr = { ok: false; code: string; message: string };
