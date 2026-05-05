# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Express + Vite middleware on port 3000)
npm run build      # Build frontend (Vite) + bundle server (esbuild → dist/server.cjs)
npm start          # Run production build
npm run lint       # TypeScript type-check (tsc --noEmit) — no separate test suite
npm run clean      # Remove dist/
```

There are no automated tests. `npm run lint` is the only correctness gate — run it after changes.

The dev server is a single process: `tsx server.ts` boots Express on port 3000, which embeds Vite as middleware in dev mode and serves `dist/` in production.

## Architecture

### Monorepo layout (flat)
- `server.ts` — Express + Socket.io backend (one file)
- `src/` — React SPA frontend
- Shared game logic lives in `src/gameLogic.ts` and `src/aiEvaluator.ts`; the server imports them directly via `.js` extensions (ESM)

### Game logic (pure, shared client+server)
- `src/gameLogic.ts` — All canonical state transitions: `createInitialState`, `applyMove`, `applyMoveFast`, `isValidMove`, `cloneGameState`, `checkWinner`. The server and frontend both call these same functions.
- `src/aiEvaluator.ts` — Minimax with alpha-beta pruning. `getBestMove(state, difficulty)` (depth 1–5), `evaluateMoveAccuracy` (returns `AccuracyResult` with label + delta), `getCoachText` (human-readable explanation for review). The server runs the AI; the client only calls it for review replay.
- `applyMoveFast` skips move history tracking — use it only in the AI hot path. `applyMove` is the canonical version for all real game state.

### State management pattern
- `useGameState` hook owns all live game state and Socket.io event wiring. It uses **refs alongside state** (`playerRoleRef`, `gameStateRef`, `accuracyLogRef`) to avoid stale closures inside socket callbacks — follow this pattern for any new socket handlers.
- `GameRoomPage` is the only consumer of `useGameState`; it is purely a display/orchestration layer.

### Auth and persistence (fully local)
- No backend database. Auth is `localStorage`-only (keys: `sttt_users`, `sttt_session`). `AuthContext.tsx` exposes `useAuth()`, `registerWithEmail`, `loginWithEmail`, `saveLocalProfile`.
- `ProfilePage` was previously wired to Firebase — that code is gone. Both `LobbyPage` and `ProfilePage` now read local history only.
- Three separate localStorage namespaces written on game end (all in `GameRoomPage`'s `gameOverData` effect):
  - `review_<matchId>` — `CompletedGameRecord` (full move list + accuracy log) for the review page
  - `match_history_<uid>` — array of `MatchRecord` (capped at 50) for lobby/profile history display; includes `isBotMatch` and `botDifficulty`
  - `sttt_users` — updated `UserProfile` (Elo, accuracy, W/L/D) via `saveLocalProfile`
- After saving a profile update from any component, dispatch `window.dispatchEvent(new Event('profile-updated'))` — `AuthContext` and `LobbyPage` both listen for this to re-sync.

### Real-time flow
1. Client emits `join_match` → server assigns role (X/O/Spectator) and responds with `match_joined` + broadcasts `match_state`
2. Client emits `make_move` → server validates, calls `applyMove` + `evaluateMoveAccuracy`, broadcasts `move_made` to room
3. Bot matches: server triggers `handleBotMove` after each human move; bot plays as O with a delay proportional to difficulty
4. Game end: server emits `game_over`, deletes the `ActiveGame` from its in-memory map
5. Stale games are cleaned up every 5 minutes (30-minute inactivity timeout)

### Review system
`/review/:matchId` is a self-contained replay page. It reconstructs any board position by replaying `record.moves[0..n]` from `createInitialState()` — no socket connection needed. Self-review branch mode forks from the current position; branch moves are tracked separately from the main line.

### Component conventions
- `SuperBoard` → `SubBoard` are pure rendering components. `SuperBoard` accepts optional `lastMove` (amber highlight) and `bestMove` (green highlight) props used by the review page.
- `cn()` from `utils.ts` wraps `clsx` + `tailwind-merge` — always use it for conditional class merging.
- Animations use `motion/react` (Motion for React), not `framer-motion` directly.

### Bot difficulty
Difficulty 1–5 maps to minimax search depth. Labels (`Beginner`→`Expert`) and per-level Tailwind colour strings live in `BOT_DIFFICULTY_LABELS` / `BOT_DIFFICULTY_COLORS` in `utils.ts` — import from there rather than redefining inline. The server's `game_over` event includes `botDifficulty` in `matchDetails`; the `GameOverData` type in `useGameState.ts` and `MatchDetails` in `types.ts` both carry this field.

### Types
All shared types are in `src/types.ts`. `GameState.moves` is the authoritative move history (array of `Move`). `MoveAccuracyLog` accumulates client-side during play and is persisted in the review record. `MatchRecord` includes `isBotMatch` and `botDifficulty` — always populate both when saving history for bot games.
