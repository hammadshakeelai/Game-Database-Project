# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Repository shape

This is a university **database course project**. Two halves:

- `milestone 1/` … `milestone 4/` — graded coursework (SQL, ERDs, normalization).
  **Frozen.** Do not restructure or move these; a grader reads them on `main`.
- `app/` — the playable application. All engineering work goes here.

## Commands

Run everything from `app/`.

```bash
npm run dev              # Dev server (needs real Firebase config in .env)
npm run dev:emulators    # Dev server against the Firebase emulators — prefer this
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit (strict)
npm test                 # Unit tests
npm run test:integration # Socket + security-rules tests (starts emulators)
npm run test:e2e         # Playwright
npm run build            # Vite build + esbuild server bundle
```

Requires Node 20+ and Java 21+ (the Firestore emulator is a Java process).

If an emulator run fails with "port taken", `npm run emulators:free` clears the
stale Java child — the test scripts already do this first.

## The game

**Ultimate Tic-Tac-Toe**, not classic 3×3. Nine sub-boards inside one
super-board. The _cell index_ of your move dictates which sub-board the opponent
must play in (`nextRequiredSubBoard`); if that board is already decided or full,
they may play anywhere. Three sub-boards in a line wins.

Rules live in `src/gameLogic.ts` and are imported unchanged by both the client
and the server. Do not duplicate rule logic into components.

## The one invariant that matters

**A user's identity comes only from `socket.data.user`, set by the handshake
middleware in `server/index.ts` from a verified Firebase ID token.**

No socket handler may read a `uid`, mark, or role out of its own payload. The
pre-rewrite server did exactly that, which let any client act as any player.
When adding a handler, derive the actor via `store.markOf(match, me().uid)` and
use the existing `requirePlayer()` helper in `server/gameHandlers.ts`.

Related consequences:

- The client sends _intents_, never state. `make_move` carries indices only.
- The server re-validates every move with `isValidMove`, even though the UI
  already checked — the UI check exists only to avoid a doomed round trip.
- Results are written to Firestore by the Admin SDK. Clients cannot write
  `match_records` at all, and may change only `displayName` / `photoURL` on their
  own profile. If you add a collection, add rules for it: there is a catch-all
  deny at the bottom of `firestore.rules`.

## Architecture

```
Browser ── Firebase Auth (Google) ──► ID token
   │
   └── socket.io handshake { auth: { token } }
              │
              ▼
        io.use() → verifyIdToken() → socket.data.uid
              │
              ▼
        MatchStore (in-memory, authoritative)
              │
              └──► Firestore: users/, match_records/
```

| File                             | Role                                               |
| -------------------------------- | -------------------------------------------------- |
| `server/index.ts`                | Express, socket.io, auth handshake, REST endpoints |
| `server/gameHandlers.ts`         | All socket events and authorization                |
| `server/matchStore.ts`           | Rooms, codes, lifecycle, reaping                   |
| `server/persistence.ts`          | Firestore writes; best-effort, never fatal         |
| `src/features/game/useSocket.ts` | One authenticated socket per session               |
| `src/features/game/useMatch.ts`  | Match state, auto re-join on reconnect             |
| `src/features/game/Board.tsx`    | Pure board rendering                               |

## Conventions

- **State lives on the server.** Client state mirrors `match_update` broadcasts.
- **Match lifecycle:** `waiting` → `active` → `finished`. Finished matches are
  kept in memory for ten minutes so refresh and rematch work. Do not delete a
  match on game over — that was the old bug that broke both.
- **Errors** use the `ErrorCode` union. Add player-facing copy to `ERROR_COPY` in
  `src/features/game/types.ts`; never surface a raw backend error.
- **Accessibility:** turn, target board, and winner must be conveyed by text as
  well as colour. Loading states carry labels.
- `cn()` from `src/utils.ts` merges Tailwind classes.
- Animations use `motion/react`. Respect the reduced-motion block in `index.css`.

## Testing expectations

Fix the implementation, not the test. Do not reach for `any`, `ts-ignore`, or a
disabled lint rule — ESLint treats `no-explicit-any` as an error.

New multiplayer behaviour needs an integration test in `tests/integration/`; the
harness gives you real sockets and real emulator-minted tokens. New rules need a
test in `firestoreRules.test.ts`, which runs as a real client so the rules are
actually enforced.

## Out of scope

The localStorage social features (friends, groups, tournaments, notifications,
global chat) were removed in v2. They were per-browser fakes that could not work
across devices. They remain on the `archive/pre-v2-2026-09` branch. Do not
reintroduce them without a real backend.
