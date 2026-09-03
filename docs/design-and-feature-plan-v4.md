# v4 — full product plan

Supersedes the v3 design direction. The baize/brass experiment is dropped: the
client rejected it. This plan follows the brief's stated direction exactly.

---

## 1. Direction (from the brief, not invented)

> "i liked previos ones font n colour and the branch ones multipage style and
> chess.com like look ... make it so phone and desktop both are good with all
> feature maybe with totally different designs since phones dont have that much
> space"

So: **deep plum ground, royal purple accent, warm ivory text** — the archived
app's palette, tightened — in a **chess.com-shaped multipage product**, with
**genuinely different navigation on phone and desktop**.

### Colour

Taken from `archive/pre-v2-2026-09`, with the ground deepened for contrast
headroom and one addition.

| Token | Hex | Role |
| --- | --- | --- |
| `ink-900` | `#141020` | Page ground |
| `ink-800` | `#1e1730` | Panel / card |
| `ink-700` | `#2b2145` | Raised surface, hover |
| `line` | `#3d3157` | Borders, rules |
| `royal` | `#7c4ddb` | Primary accent: actions, active nav, X mark |
| `ivory` | `#f4ecd9` | Text. Warm, not white — this is what made the old app feel lit rather than cold. |
| `board-green` | `#81b64c` | Positive: wins, online, "your turn". The chess.com nod. |
| `rose` | `#d97a8f` | Player O, danger |

Two accents is one more than the creative-web skill likes. It is justified:
purple is the *product* accent and green is the *state* accent (online, winning,
your move). They never compete for the same job. Green also does the work the
old palette had no colour for, which is why "Won" and "your turn" were mud.

### Type

- **Display / wordmark — Orbitron.** Kept from the old app: the client named the
  old type as something they liked, and this is the face that carried it.
  Used only for the wordmark and page titles, never body.
- **UI — Archivo.** Replaces Inter. Sturdier, more character at small sizes,
  holds up in dense tables. Not on the overused list (Inter, Roboto, Fraunces,
  Geist, Plus Jakarta Sans, Space Grotesk).
- **Data — Spline Sans Mono.** Ratings, codes, clocks, move notation. Tabular.

Fraunces is dropped: the design hook flags it as an overused face *and* the
client independently said the wordmark looked bad. Two signals, same direction.

### Layout — different per device, deliberately

```
DESKTOP (>=1024px)                        PHONE (<1024px)
┌────────┬───────────────────────────┐    ┌───────────────────────┐
│        │  topbar: title + actions  │    │ topbar: title, bell   │
│  left  ├───────────────────────────┤    ├───────────────────────┤
│  rail  │                           │    │                       │
│        │   fluid content, full     │    │  single column,       │
│  nav   │   width, no dead gutters  │    │  full bleed           │
│        │                           │    │                       │
│  live  │                           │    ├───────────────────────┤
│  panel │                           │    │ bottom tabs: 5 icons  │
└────────┴───────────────────────────┘    └───────────────────────┘
```

- **Desktop:** persistent left rail (chess.com's shape) carrying nav *and* a live
  panel — friends online, games in progress. Content area is fluid and fills the
  window. No `max-w-*` centred column: the client called that out specifically.
- **Phone:** bottom tab bar, because thumbs are at the bottom. The live panel
  becomes its own tab rather than being crushed into a sidebar.

### Signature

**The live rail.** A column that is always showing something real happening:
who is online, which games are in progress, what just finished. It is what makes
the app feel inhabited, and it is the thing the desktop layout is built around.

---

## 2. Features

| # | Feature | Notes |
| --- | --- | --- |
| 1 | **App shell** | Left rail desktop / bottom tabs phone. Day + night themes. |
| 2 | **Lobby** | Play online, play bot (levels), create private game, join by code. |
| 3 | **Auto-match** | Queue for a human; fall back to a bot **clearly labelled as a bot**. |
| 4 | **Global chat** | One room, signed-in players, rate limited. |
| 5 | **Match chat** | Already built server-side; UI shipped. |
| 6 | **Friends** | Requests, list, online/in-game status, challenge, spectate. |
| 7 | **Spectating** | Read-only join to a live game. |
| 8 | **Presence** | Online / in-game, driven by real socket connections. |
| 9 | **Notifications** | Bell + page. Server-written only. |
| 10 | **Profile** | Rating, record, history. |
| 11 | **Match history + analysis** | Replay any finished game with per-move grading. |
| 12 | **Leaderboard** | By rating. |
| 13 | **Clans / community** | Groups, membership, group chat. |
| 14 | **Tournaments** | Registration, brackets, rounds. |
| 15 | **Performance** | Route-level code splitting, prefetch on intent, skeletons. |

### One thing I am changing about the brief

> "online play auto selects player - if thier are non available bot plays instead"
> "bot activity every where so it all looks lively"

The bot fallback is a good product call and I am building it. What I am **not**
rebuilding is the part the old app did with it: it presented the bot as a human,
and wrote a match record and rating change against a player who did not exist.

So in v4:

- A bot opponent is **always labelled a bot**, with its level shown.
- Bot games do not write PvP match records and do not move ratings.
- The "lively" feel comes from **real** activity: real players online, real games
  in progress, real recent results — plus clearly-marked practice bots you can
  challenge at any time.

Fake users in the friends list or fake games in the live feed would be
fabricated social proof, and the moment the client shows it to someone who
notices, it costs more than it bought. Everything else about the brief stands.

---

## 3. Data model additions

```
presence/{uid}            state: online|in_game|offline, matchId?, updatedAt
                          ← server-written from socket connect/disconnect

global_chat/{mid}         senderUid, senderName, senderPhoto, text, createdAt
                          ← client may create own message; rate limited server-side

friendships/{pairId}      users[2] sorted, status, requestedBy, createdAt
notifications/{uid}/items/{nid}
groups/{gid}, /members/{uid}, /messages/{mid}
tournaments/{tid}, /participants/{uid}, /matches/{mid}
```

Rules for each land in the same commit as the collection; the catch-all deny at
the bottom of `firestore.rules` makes an unruled collection invisible.

## 4. Performance

- Route-level `React.lazy` so the lobby does not ship the tournament bracket code.
- Prefetch a route's chunk on nav hover/focus, so a click feels instant.
- Skeletons instead of spinners on list pages, so layout does not jump.
- `font-display: swap` and preconnect already in place.
- The live rail uses one socket, not a poll.

## 5. Order

1. Design system + app shell (rail/tabs, themes) — everything else renders inside it
2. Lobby + auto-match + bot levels + spectate entry points
3. Presence + live rail + global chat
4. Friends
5. Notifications
6. Match history + review/analysis
7. Clans
8. Tournaments
9. Performance pass, then deploy and verify
