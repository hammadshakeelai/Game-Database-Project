# v2 Implementation Plan — Super Tic-Tac-Toe

## 1. Current architecture (audit)

React 19 + Vite SPA talking to an Express + socket.io server that holds
authoritative game state in memory. Firebase is a dependency but is **not wired
up**: `firebase.ts` initializes an app, and nothing else uses it.

### What works and is worth keeping

- `gameLogic.ts` — clean, pure, deterministic, correctly implements Ultimate TTT
  including the forced-sub-board and free-move rules. Shared by client + server.
- Server-authoritative move handling: clients emit intent, server validates via
  `isValidMove` and broadcasts the resulting state.
- `aiEvaluator.ts` — a real minimax bot with difficulty buckets.
- `useSocket` / `useGameState` — sensible separation; `useGameState` already uses
  refs to dodge stale closures.
- Stale-game reaper (30 min) and socket.io reconnection config.
- `firestore.rules` — already specifies `users` / `match_records` least-privilege
  validation. The previous author intended a Firestore migration and stopped.

### What is broken

1. **Authentication is fake.** `AuthContext` is `isLocalMode: true`, backed
   entirely by `localStorage`. There is no Google sign-in anywhere. Identity is
   whatever the browser says it is.
2. **Total impersonation on the socket.** `userId` arrives as an unverified
   client field on `create_match`, `join_match`, `join_queue`. Any client can
   act as any user.
3. `resign` takes `player` from the client — either side can resign as the other.
4. `accept_draw` / `decline_draw` / `offer_draw` — no check that the actor is the
   opponent. A spectator can end someone else's game.
5. `accept_rematch` sets `players.X` to whoever accepted, with an empty `O` —
   roles scramble and the original opponent is not bound to the new game.
6. `join_match` **auto-creates** a game for an unknown `matchId`, so a mistyped or
   expired room code silently becomes a new empty game instead of an error.
7. Finished games are deleted from `activeGames` the instant they end, which is
   why rematch and post-game refresh recovery cannot work.
8. `request_hint` has no membership check; `join_room` lets any socket join any
   room id and read another group's chat; `global_chat_send` trusts a client
   `sender` field with no auth and no rate limit.
9. `PORT = 3000` hardcoded and CORS set to a wildcard origin — breaks every PaaS.
10. **Fabricated opponents.** After `QUEUE_TIMEOUT_MS = 1200` (1.2 seconds), Quick
    Match pairs the user with a bot drawn from a hardcoded pool of fake names, and
    `buildMatchDetails` deliberately reports `isBotMatch: false` so that Elo and
    stats update. This writes match records against players who do not exist.
11. Zero tests, no CI, `lint` is only `tsc --noEmit`, and `tsconfig` has no `strict`.
12. `clean: "rm -rf dist"` fails on Windows/PowerShell.

### Fragile / dead

- All persistence is `localStorage` (`stores.ts`, 825 lines) — cleared with site data.
- In-memory games vanish on server restart.
- `Untitled-1.txt`, `firebase-applet-config.json`, `firebase-blueprint.json`,
  `metadata.json` — AI Studio scaffolding artifacts.
- `.env.example` documents `GEMINI_API_KEY` for an AI Studio runtime that no
  longer applies.

## 2. Target architecture

Keep the socket server. It is already authoritative, and its single-threaded
event loop gives move atomicity for free. Expressing the forced-sub-board rule of
Ultimate TTT in Firestore security rules would be far worse, and the Cloud
Functions alternative needs billing enabled.

```
Browser --- Firebase Auth (Google) --> ID token
   |
   +--- socket.io handshake { auth: { token } }
              |
              v
        io.use() -> admin.verifyIdToken() -> socket.data.uid   (server-derived)
              |
              v
        Authoritative game server (in-memory activeGames)
              |
              +--> Firestore (admin SDK): users/, match_records/
```

**The rule: `uid` is only ever derived server-side from a verified token. No
handler may read an identity out of its own payload.**

## 3. Migration strategy

Incremental, on `feat/tictactoe-v2`, in small commits. `gameLogic.ts` and
`aiEvaluator.ts` are preserved as-is — they are the good parts. The socket
handlers are rewritten around a verified `uid`. The React shell stays; auth and
the game room are rebuilt.

## 4. Authentication

Firebase Auth with the Google provider — chosen because Firebase is already a
dependency, its free tier needs no credit card, and it pairs with Firestore so the
project has exactly one backend dependency rather than two.

- Client: `signInWithPopup(GoogleAuthProvider)`, session persisted by the SDK.
- Socket: ID token in the handshake, re-attached on reconnect, refreshed on expiry.
- Server: `firebase-admin` verifies the token and derives `uid`.
- Profile: `displayName` and `photoURL` come from the Google account.

## 5. Realtime multiplayer

- One socket per browser tab (`useSocket`); rooms keyed by `matchId`.
- Client emits intent only. Server validates, applies, broadcasts `move_made`.
- Every mutating handler re-checks: is this socket a player in this match, and is
  it that player's turn.
- Finished games are retained for a grace window so both clients can reconnect,
  see the result, and rematch.

## 6. Data model (Firestore)

```
users/{uid}
  displayName, photoURL, createdAt,
  matchesPlayed, wins, losses, draws

match_records/{matchId}
  playerX, playerO, playerXName, playerOName,
  winner, status, movesCount, createdAt, finishedAt
```

Written only by the server via the admin SDK. Clients read; they never write results.

## 7. Security

- Rules: users may read profiles and write only their own non-stat fields; stats
  and match records are server-written only.
- Socket: verified `uid`, membership checks on every handler, payload validation
  (indices must be integers in 0-8), rate limiting on chat.
- Remove the fabricated-opponent system entirely; replace it with an honest,
  clearly labeled "Play vs Computer" mode that does not write PvP records.
- An explicit `CLIENT_ORIGIN` allowlist instead of a wildcard CORS origin.
- Firebase web config moved to `VITE_` env vars. These are public identifiers
  rather than secrets, but this makes environments switchable and stops a key
  rotation from being a code edit.

## 8. Testing

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | `gameLogic`: sub-board win, sub-board draw, super-board win, forced sub-board, free move on a decided target, occupied cell, move after game over, alternating turns, reset |
| Integration | Vitest + real socket.io client + Firebase Auth emulator | join/create room, full room, invalid room, illegal move, wrong turn, impersonation attempt, simultaneous moves, double-click, resign/draw authorization, rematch, reconnect |
| E2E | Playwright, two browser contexts | Full two-player flow, win sync, refresh recovery, rematch |

Auth is exercised against the **Firebase Auth emulator**, never real Google OAuth.
This also decouples all testing from the blocked console actions.

## 9. Deployment

Frontend and server ship together as one Node process — the server already serves
`dist/` — so a single container-style host is the right shape. The platform is
selected against persistent WebSocket support, a real free tier, and no credit
card requirement. Config is committed so deployment is a one-click repo connect.

## 10. Git

```
archive/pre-v2-2026-09  (+ tag pre-v2)   old app, pushed
feat/tictactoe-v2                        development
main                                     promoted after the quality gate
```

## 11. Definition of done

Two people on different networks sign in with Google, one creates a room and
shares the link, the other joins, they play a synchronized game to a correct
shared result, and can rematch — with refresh, disconnect, illegal moves and
impersonation attempts all handled correctly.

## 12. Known blockers requiring account owner action

Deployment and Google OAuth need console access this environment does not have
(no Firebase CLI login, no valid Vercel token, no service-account credential).
Everything else is built and verified locally against emulators; the exact manual
steps are documented in the README.
