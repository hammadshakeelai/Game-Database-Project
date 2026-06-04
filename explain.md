 ---
  Game Database Project — Complete Database Breakdown

  What the Project Is

  This is a Super Tic-Tac-Toe multiplayer platform. Super Tic-Tac-Toe is a 9x9 variant where the board is 9 smaller 3x3
  boards. It supports real-time multiplayer, AI bots, tournaments, player stats, friends, groups, and chat.

  The interesting thing from a database perspective is that there are actually three data layers in this project — an
  academic relational design, a Firebase NoSQL design, and the actual running app's storage.

  ---
  Layer 1: The Relational (SQL) Schema Design — schema_description.md

  This is the academic/milestone design — a proper normalized relational database with 12 tables.

  Core entities (standalone tables):

  ┌────────────┬────────────────────────────────────────────────────────┐
  │   Table    │                        Purpose                         │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ PLAYER     │ All registered users. Has ELO rating starting at 1000. │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ GAMETYPE   │ Types of game variants (e.g., classic, timed).         │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ GAME       │ Each individual match played.                          │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ TOURNAMENT │ A competitive event.                                   │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ STRUCTURE  │ Bracket format (round-robin, elimination, etc.)        │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ GROUP      │ Player clubs/groups.                                   │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ CHAT       │ A DM thread between two players.                       │
  ├────────────┼────────────────────────────────────────────────────────┤
  │ MESSAGE    │ Individual messages inside a chat thread.              │
  └────────────┴────────────────────────────────────────────────────────┘

  Junction tables (resolve M:N relationships):

  ┌──────────────┬─────────────────────────────┬────────────────┐
  │    Table     │          Resolves           │  Composite PK  │
  ├──────────────┼─────────────────────────────┼────────────────┤
  │ GAME_HISTORY │ Player ↔ Game               │ (PID, GAME_ID) │
  ├──────────────┼─────────────────────────────┼────────────────┤
  │ PARTICIPANT  │ Player ↔ Tournament         │ (TID, PID)     │
  ├──────────────┼─────────────────────────────┼────────────────┤
  │ FRIENDS      │ Player ↔ Player (self-join) │ (PID1, PID2)   │
  ├──────────────┼─────────────────────────────┼────────────────┤
  │ GROUP_LIST   │ Player ↔ Group              │ (GID, PID)     │
  └──────────────┴─────────────────────────────┴────────────────┘

  Key design decisions to understand:

  - GAME.Winner is a nullable FK to PLAYER — NULL means draw or in-progress. This is an intentional semantic null.
  - GAME.Tournament_ID is nullable — a game can exist outside any tournament. This is a partial participation
  constraint.
  - FRIENDS is a self-referential M:N — PLAYER has a relationship with itself. The junction table enforces PID1 < PID2
  to prevent storing (A,B) and (B,A) as two separate friendships (symmetry enforcement).
  - TOURNAMENT → STRUCTURE is a mandatory 1:1 — every tournament must have exactly one bracket. Enforced by a UNIQUE
  constraint on TOURNAMENT.struct_ID.
  - CHAT should have UNIQUE(PID1, PID2) — to prevent two DM threads between the same pair.

  Normalization:
  - The schema is in 3NF (Third Normal Form). Each non-key attribute depends on the whole key and nothing but the key.
  - Junction tables eliminate M:N relationships, which can't exist directly in a relational model.

  ---
  Layer 2: Firebase Firestore (NoSQL) Design — firebase-blueprint.json

  This is what was originally planned as the actual backend. Firebase Firestore is a document-oriented NoSQL database.

  /users/{userId}          → User profile (ELO, stats, accuracy)
  /usernames/{username}    → username → UID mapping (for uniqueness)
  /global_chat/{messageId} → Chat messages
  /match_records/{matchId} → Completed match history

  Key database design concept here:

  The /usernames/ collection is a clever NoSQL pattern. In SQL you'd just put UNIQUE NOT NULL on the username column. In
  Firestore, you can't enforce uniqueness across documents the same way — so you create a separate flat collection
  where the document ID is the username. If the document exists, the username is taken. This is a NoSQL workaround for
  what SQL handles natively with constraints.

  SQL vs NoSQL tradeoffs visible here:

  ┌───────────────┬─────────────────────────────────┬─────────────────────────────────────────┐
  │    Concern    │           SQL Design            │             Firebase Design             │
  ├───────────────┼─────────────────────────────────┼─────────────────────────────────────────┤
  │ Friends       │ Separate FRIENDS junction table │ Not modeled                             │
  ├───────────────┼─────────────────────────────────┼─────────────────────────────────────────┤
  │ Groups        │ GROUP + GROUP_LIST tables       │ Not modeled                             │
  ├───────────────┼─────────────────────────────────┼─────────────────────────────────────────┤
  │ Chat          │ CHAT + MESSAGE tables           │ Flat global_chat (only global, no DMs)  │
  ├───────────────┼─────────────────────────────────┼─────────────────────────────────────────┤
  │ Uniqueness    │ UNIQUE constraint               │ Separate /usernames/ collection pattern │
  ├───────────────┼─────────────────────────────────┼─────────────────────────────────────────┤
  │ Match history │ GAME_HISTORY junction           │ Flat match_records collection           │
  └───────────────┴─────────────────────────────────┴─────────────────────────────────────────┘

  The Firebase design is much flatter and simpler — it trades relational correctness for scalability and simplicity.

  ---
  Layer 3: What the App Actually Uses — localStorage

  The CLAUDE.md reveals the current truth:

  ▎ "No backend database. Auth is localStorage-only."

  The running app stores everything in the browser's localStorage with three namespaces:

  sttt_users          → All user profiles (array, like an in-memory table)
  sttt_session        → Current logged-in user
  review_<matchId>    → Full move list + accuracy log for each game
  match_history_<uid> → Per-player match history (capped at 50 records)

  From a database perspective, localStorage is not a database. It has:
  - No query language
  - No indexing
  - No referential integrity
  - No transactions
  - No concurrent write safety
  - Storage limited to ~5MB

  The cap of 50 match records is a manual workaround for the storage limit — in a real database this would be handled by
  pagination queries.

  ---
  The Big Picture: Evolution of the Design

  Academic SQL Design          Firebase NoSQL Design         Actual Implementation
  (12 tables, fully           (4 collections, planned       (localStorage only,
   normalized, relational)     but partially abandoned)      no real DB at all)
   normalized, relational)     but partially abandoned)      no real DB at all)
         ↓                            ↓                              ↓
   normalized, relational)     but partially abandoned)      no real DB at all)
         ↓                            ↓                              ↓
  Academic SQL Design          Firebase NoSQL Design         Actual Implementation
  (12 tables, fully           (4 collections, planned       (localStorage only,
   normalized, relational)     but partially abandoned)      no real DB at all)
   normalized, relational)     but partially abandoned)      no real DB at all)
         ↓                            ↓                              ↓
  (12 tables, fully           (4 collections, planned       (localStorage only,
   normalized, relational)     but partially abandoned)      no real DB at all)
         ↓                            ↓                              ↓
  (12 tables, fully           (4 collections, planned       (localStorage only,
   normalized, relational)     but partially abandoned)      no real DB at all)
         ↓                            ↓                              ↓
  (12 tables, fully           (4 collections, planned       (localStorage only,
  - No transactions
  - No concurrent write safety
  - Storage limited to ~5MB

  The cap of 50 match records is a manual workaround for the storage limit — in a real database this would be handled by pagination queries.

  ---
  The Big Picture: Evolution of the Design

  Academic SQL Design          Firebase NoSQL Design         Actual Implementation
  (12 tables, fully           (4 collections, planned       (localStorage only,
   normalized, relational)     but partially abandoned)      no real DB at all)
         ↓                            ↓                              ↓
    Best for learning          Good for scaling             Works for demos/local
    database concepts          without SQL server           but doesn't persist
                                                            across devices/browsers

  ---
  Key Database Concepts This Project Teaches

  1. Primary Keys — every table has one (simple or composite)
  2. Foreign Keys + Referential Integrity — GAME references PLAYER, GAMETYPE, TOURNAMENT
  3. Nullable FKs — semantic meaning of NULL (draw vs. winner)
  4. Junction Tables — the right way to model M:N in SQL
  5. Self-referential relationships — FRIENDS on PLAYER
  6. 1:1 mandatory relationships — TOURNAMENT → STRUCTURE
  7. ELO Rating — stored as an INT, updated after each game
  8. SQL vs NoSQL tradeoffs — when flat documents beat normalized tables
  9. NoSQL uniqueness patterns — the /usernames/ collection trick

  ---