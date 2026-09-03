# v3 Plan — full feature set on Firebase, plus a real design pass

Supersedes the scope boundary in `implementation-plan.md` §11. The user explicitly
asked for the removed features back, on Firebase, and for the UI to be rebuilt using
the `creative-web` skill (vendored at `.claude/skills/creative-web/`).

---

## Part A — Design

### 1. Design read

- **Mode** — **Operate** for lobby, profile, leaderboard, friends, groups, tournaments.
  **Experience** for the board. **Persuade** for exactly one page: sign-in.
  The old build applied Persuade styling (gradient hero CTA, feature pills) to an
  Operate app. That is the failure the skill names first.
- **Emotion** — the specific tension of a game where a small move has a large,
  delayed consequence. Concentration, not excitement.
- **Metaphor** — **the club scoresheet**. A game recorded on paper at a table:
  ruled grid, stamped marks, notation in the margin, a rating written at the end.
  Not an arcade, not a neon dashboard.
- **Hero interaction** — the board, and only the board.
- **The one aesthetic risk** — a **mid-lightness baize ground**. Neither the dark-app
  default nor the tasteful-light-editorial reflex.

**What stays still:** the entire chrome. Nav, cards, stat tiles, lists, tables and
page transitions do not animate. Motion is spent on the mark landing, the sub-board
being won, and the turn indicator. Nine sub-boards plus animated cards plus animated
nav is how a dense page becomes unreadable.

### 2. Reflex ladder

| Order | What an AI would produce for "online board game" | Verdict |
|---|---|---|
| 1st | Dark ground, purple/violet glow, glass cards, gradient CTA, Inter | **This is the current build.** Discard. |
| 2nd | Cream editorial, big serif, generous white void | Saturated. Discard. |
| **Live escape** | **Physical material**: card-table baize, ink-stamped marks, scoresheet notation, brass accent | Take this. |

### 3. Fingerprint gate

Against `.claude/skills/creative-web/FINGERPRINTS.md`, which has two rows
(portfolio spec-sheet on light vellum L 0.945 / H 45; Chladni plate on warm charcoal
L 0.190 / achromatic). Required: differ on **4 of 6** against **each row individually**.

| Dimension | This build | vs row 1 | vs row 2 |
|---|---|---|---|
| Grammar | Dashboard + single-object board study | ✅ differs (spec sheet) | ✅ differs (object study is close, but this is a multi-screen app) |
| Nav | Persistent app nav, always present | ✅ differs (none) | ✅ differs (none) |
| Hero device | Playable authoritative board | ➖ both "live interactive" | ✅ differs |
| Palette | **Baize L 0.34 / H 155**, bone text, brass H 75 accent | ✅ differs (L 0.945) | ✅ differs (L 0.190, achromatic) |
| Type | Fraunces (display) + Public Sans (UI) | ✅ differs (Archivo + IBM Plex Mono) | ✅ differs (Bodoni Moda + DM Mono) |
| Signature | Marks land as **pressed stamps**; won boards take an ink overlay; the move list reads as scoresheet notation | ✅ differs | ✅ differs |

**5/6 against row 1, 6/6 against row 2.** Gate passes. Append a row when it ships.

**Two of my own habits broken:** (1) dark ground with a violet accent — used in every
screen of the current build; (2) Inter as the default UI face.

### 4. Dials

**VARIANCE 3 / MOTION 3 / DENSITY 7.** Product UI. High density and high motion are
mutually exclusive, and density wins here because the app is mostly lists and a grid.

### 5. Gate

`npm run design:scan` (slopscan) must exit clean. Wired into CI. Currently clean.

---

## Part B — Data model

All new collections need rules in the **same commit**: `firestore.rules` ends in a
catch-all deny, so a collection without rules is invisible.

```
users/{uid}                      elo, matchesPlayed, wins, losses, draws,
                                 displayName, photoURL, createdAt
  ← client may write displayName/photoURL only. Stats + elo server-only.

match_records/{matchId}          playerX/O(+Name,+Photo), winner, reason,
                                 movesCount, moves[], eloBefore{}, eloAfter{},
                                 createdAt, finishedAt
  ← server-only write. Readable by signed-in users. moves[] powers review.

friendships/{pairId}             users[2] (sorted), status, requestedBy,
                                 createdAt, respondedAt
  ← pairId = sorted uids joined, so a request cannot be duplicated.
    Only the two parties read. Only the recipient may flip pending→accepted.
    requestedBy is immutable.

notifications/{uid}/items/{nid}  type, title, body, link, read, createdAt
  ← recipient reads and may set read:true. CLIENT MAY NOT CREATE
    (otherwise one player can spam another's bell). Server writes.

groups/{gid}                     name, description, ownerUid, memberCount, createdAt
groups/{gid}/members/{uid}       role (owner|admin|member), joinedAt
groups/{gid}/messages/{mid}      senderUid, senderName, text, createdAt
  ← membership gates message read/write. Role changes require the actor
    to be owner/admin, checked by reading the actor's own member doc.

tournaments/{tid}                name, format, status, ownerUid, maxPlayers,
                                 startsAt, createdAt
tournaments/{tid}/participants/{uid}   displayName, elo, seed, joinedAt
tournaments/{tid}/matches/{mid}        round, playerA, playerB, winner, matchId
  ← registration is the one client write. Bracket + results server-only.
```

### Composite indexes (add as each query is written)

The emulator invents indexes; production refuses without them. Learned the hard way.

- `match_records`: (playerX, finishedAt desc), (playerO, finishedAt desc) — **done**
- `users`: (elo desc) — leaderboard
- `friendships`: (users array-contains, status)
- `notifications/{uid}/items`: (read, createdAt desc)
- `groups/{gid}/messages`: (createdAt desc)
- `tournaments`: (status, startsAt)

---

## Part C — Order of work

Dependency-ordered, not preference-ordered.

| # | Phase | Why here |
|---|---|---|
| 0 | **Move history + Elo** | ✅ **DONE.** Urgent: games were being recorded in a shape that could never be reviewed. Both stat-write changes in one pass so nothing migrates twice. |
| 1 | **Two sign-in demos** | Explicitly requested, cheap, self-contained, and the only item a first-time visitor sees before signing in. Ported from `archive/pre-v2-2026-09:app/src/pages/AuthPage.tsx`. |
| 2 | **Design system** | Tokens, type, board treatment. Everything after this is built in the new language rather than retrofitted. |
| 3 | **Profile, Elo & leaderboard** | Data already exists after phase 0. Pure read UI + one index. |
| 4 | **Friends** | First new collection with non-trivial rules. |
| 5 | **Review & AI grading** | `aiEvaluator.ts` already in repo and unused for review; `moves[]` now persisted. |
| 6 | **Notifications** | Needed by friends + groups + tournaments; build once they exist to notify about. |
| 7 | **Groups** | Membership, roles, chat. |
| 8 | **Tournaments** | Largest; bracket generation is the only genuinely new logic. |
| 9 | **Deploy + verify live** | Per phase where possible, not only at the end. |

Every phase: rules + rules tests + indexes + `design:scan` + typecheck + lint + tests.

## Definition of done for v3

A signed-in player can see their rating and history, add a friend and challenge them,
review a finished game move by move with engine grading, join a group and chat in it,
enter a tournament and play its bracket — all backed by Firestore with rules that
refuse forged writes, and a UI that passes the slopscan gate and does not read as the
default dark-purple AI app.
