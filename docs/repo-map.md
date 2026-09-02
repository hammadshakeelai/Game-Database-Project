# Repository Map

Compact architecture reference. Keep updated when architecture changes.
Prefer this + `rg` + targeted reads over re-scanning the repository.

## What this repository is

A university **database course project** (`Game-Database-Project`) for
**Super / Ultimate Tic-Tac-Toe**. Two distinct halves:

| Path | Purpose | Status |
|---|---|---|
| `milestone 1/` .. `milestone 4/` | Graded DB coursework: SQL DDL, ERD, normalization, dataset preprocessing, docs | **Frozen — do not restructure.** A grader reads these on `main`. |
| `app/` | The playable web application | Active development target |

> All v2 engineering work is **additive under `app/`**. The repo root layout is
> coursework and must survive the promotion to `main` untouched.

## The game (important)

This is **Ultimate Tic-Tac-Toe**, not classic 3x3:
- 9 sub-boards inside 1 super-board.
- Your move's *cell index* dictates which sub-board the opponent must play in
  (`nextRequiredSubBoard`).
- If that target sub-board is already decided or full, the opponent moves freely.
- Winning 3 sub-boards in a line wins the super-board.

Rules live in `app/src/gameLogic.ts` and are shared verbatim by client and server.

## Stack

| Concern | Choice |
|---|---|
| Package manager | npm (`app/package-lock.json`) |
| Frontend | React 19 + React Router 7 + Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`), `clsx` + `tailwind-merge` |
| Motion / icons | `motion` (Framer), `lucide-react` |
| Server | Express 4 + socket.io 4 (single long-lived Node process) |
| Auth | Firebase Auth (Google) — client SDK + `firebase-admin` token verification |
| Persistence | Cloud Firestore (`users`, `match_records`) |
| Local social demo data | `localStorage` via `app/src/stores.ts` (out of v2 scope) |
| Tests | Vitest (unit + integration), Playwright (E2E) |
| Build | `vite build` + `esbuild` bundle of `server.ts` -> `dist/server.cjs` |

## Runtime architecture

```
Browser (React)
   |
   |-- Firebase Auth (Google) ------> ID token
   |                                    |
   |-- socket.io (token in handshake) --+--> io.use() verifies via firebase-admin
   |                                              |
   v                                              v
GameRoomPage / LobbyPage                  Node server (authoritative)
   |                                       - activeGames: Map<matchId, Game>
   |-- useSocket() ---------------------+  - validates every move via gameLogic
   |-- useGameState() ------------------+  - single-threaded => atomic moves
                                           - writes results -> Firestore (admin)
                                                  |
                                                  v
                                            Cloud Firestore
                                            users/ match_records/
```

The server is **authoritative**: clients send an intent (`make_move`), never state.

## Key files

| File | Role |
|---|---|
| `app/server.ts` | Socket.io server, room lifecycle, authoritative move handling |
| `app/src/gameLogic.ts` | Pure rules: `isValidMove`, `applyMove`, `checkWinner`, `createInitialState` |
| `app/src/aiEvaluator.ts` | Minimax bot + move-accuracy heuristics (used by vs-Computer and hints) |
| `app/src/AuthContext.tsx` | Auth provider + profile loading |
| `app/src/firebase.ts` | Firebase client init (config from `VITE_FIREBASE_*` env) |
| `app/src/hooks/useSocket.ts` | Single socket connection, status, auth token attach |
| `app/src/hooks/useGameState.ts` | Game socket events -> React state; move/resign/draw/rematch actions |
| `app/src/pages/GameRoomPage.tsx` | The board screen |
| `app/src/pages/LobbyPage.tsx` | Create / join room, quick match |
| `app/src/stores.ts` | localStorage "database" for friends/groups/tournaments (demo scope) |
| `app/firestore.rules` | Firestore least-privilege rules |

## Environment variables

Client (`VITE_` prefix, safe to ship — Firebase web config is a public identifier):
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

Server (secret):
`FIREBASE_SERVICE_ACCOUNT` (JSON), `PORT`, `CLIENT_ORIGIN`, `NODE_ENV`

Local dev/test only: `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`.

## Scope boundary for v2

**In:** Google auth, rooms, realtime play, server-authoritative moves, win/draw,
rematch, reconnect, refresh recovery, abandoned games, profile + stats,
responsive/a11y polish, tests, CI, deploy docs.

**Out (left on localStorage, labeled demo):** tournaments, groups/clans, friends,
notifications, global chat, review page. ~2,500 lines of coursework UI that the
task explicitly deprioritizes (no social-network scope creep).
