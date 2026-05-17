# Architecture & System Design — Gaming & Tournament Platform Database

## System Overview

The Gaming & Tournament Platform Database (`game_tournament_db`) is a normalized relational database designed to support a competitive gaming ecosystem with tournaments, player rankings, social features, and real-time communication.

**Technology Stack:**
- **DBMS:** MySQL 8.0+
- **Normalization:** 1NF, 2NF, 3NF
- **Schema Size:** 16 tables, ~15K-50K rows depending on activity
- **Deployment:** Single MySQL instance (scalable to replication)

---

## Data Architecture

### Core Domains

```
┌─────────────────────────────────────────────────────────────┐
│                    GAMING PLATFORM DB                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PLAYER CORE  │  │  TOURNAMENT  │  │    GAMES     │      │
│  │ & ACCOUNTS   │  │   & EVENTS   │  │  & MOVES     │      │
│  │              │  │              │  │              │      │
│  │ • Player     │  │ • Tournament │  │ • Game       │      │
│  │ • GameType   │  │ • Structure  │  │ • GamePlayer │      │
│  │ • Leaderboard│  │ • Participant│  │ • GameMove   │      │
│  │              │  │              │  │ • GameHistory│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   SOCIAL     │  │ COMMUNICATION│  │  SYSTEM      │      │
│  │   FEATURES   │  │    LAYER     │  │  SUPPORT     │      │
│  │              │  │              │  │              │      │
│  │ • Friends    │  │ • Chat       │  │ • Notification
│  │ • Groups     │  │ • Message    │  │ • Audit Log  │      │
│  │ • GroupList  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Registration → Player Creation
                        ↓
     Players Join Tournaments → Participant Enrollment
                        ↓
     Players Compete → Games → GamePlayer + GameMove
                        ↓
        Results → GameHistory (Elo Calc) → Leaderboard
                        ↓
        Social Actions: Friends, Groups, Messages → Notifications
```

---

## Table Organization

### Lookup Tables (Reference Data)
- **GAMETYPE**: Definitions of available games (3x3, 5x5 variants)
- **STRUCTURE**: Tournament formats (single elimination, round-robin, Swiss)

**Purpose:** Avoid duplication; enable reuse across tournaments and games.

### Core Tables (Primary Entities)
- **PLAYER**: Registered user accounts with Elo, profile, status
- **TOURNAMENT**: Tournament instances with schedule, organizer, rules
- **GAME**: Individual game records with participants and outcome

**Purpose:** Represent key entities in the system.

### Junction Tables (Relationships)
- **PARTICIPANT**: Maps players to tournaments
- **GAME_PLAYER**: Maps players to games (flexible multi-player support)
- **GAME_HISTORY**: Per-player game results and Elo changes
- **GROUP_LIST**: Maps players to groups
- **FRIENDS**: Bidirectional player relationships

**Purpose:** Resolve many-to-many relationships; store relationship attributes.

### Transactional Tables (Activity Data)
- **GAME_MOVE**: Individual moves within a game
- **MESSAGE**: Messages in chats
- **NOTIFICATION**: System events

**Purpose:** Record fine-grained activity and events.

### Denormalized Tables (Performance)
- **LEADERBOARD**: Ranking snapshots (updated daily/weekly)
- **GROUP_T**: Group definitions with metadata

**Purpose:** Optimize query performance on frequently accessed aggregates.

---

## Key Design Decisions

### 1. **Many-to-Many Resolution via Junction Tables**
Instead of storing multiple player IDs per game (P1_ID, P2_ID), we use GAME_PLAYER junction table. This:
- Supports flexible participant counts (2-player, 3-player, team games)
- Keeps rows atomic (1NF)
- Enables separate player scores and statistics

### 2. **Move Storage in Separate Table**
Instead of CSV moves field in GAME, we use GAME_MOVE table:
- Each move is a separate row (atomic, queryable, replayable)
- Enables move-by-move analysis and game replay
- Maintains referential integrity with foreign keys

### 3. **Elo History in Game_History**
Instead of storing only current Elo in PLAYER:
- GAME_HISTORY stores pre/post Elo and change per game
- Enables Elo progression analysis without aggregation
- Audit trail of Elo changes

### 4. **Leaderboard Denormalization**
Instead of calculating ranks on every query:
- LEADERBOARD table stores periodic snapshots
- Trades storage for query speed (frequent access)
- Can generate hourly/daily/weekly snapshots

### 5. **No Derived Columns in Player**
We don't store wins/losses/win_rate in PLAYER because:
- Can be calculated from GAME_HISTORY (3NF compliance)
- Avoids update anomalies (one source of truth)
- Aggregate queries remain flexible

---

## Constraints & Validation

### Business Rules Enforced
1. **Elo Range:** 0-5000 (CHECK constraint + trigger)
2. **Self-Friendship Prevention:** PID1 ≠ PID2 in FRIENDS table
3. **Tournament Participant Limits:** max_participants > 1
4. **Status Enumerations:** Validated against allowed values
5. **Referential Integrity:** Foreign key cascades and restrictions

### Data Integrity
- **Unique Constraints:** email, group_name, game_type_name
- **NOT NULL on Core Columns:** All PKs, FKs, required business attributes
- **CHECK Constraints:** 15+ validation rules across tables

---

## Indexes Strategy

### Indexed Columns
| Index | Purpose | Usage |
|-------|---------|-------|
| FK columns (20+) | Join performance | Fast relationship traversal |
| player.rank_elo | Leaderboard queries | ORDER BY Elo |
| player.is_active | Active player filtering | WHERE is_active = TRUE |
| game.status | Game state queries | WHERE status IN (...) |
| tournament.scheduled_at | Upcoming tournaments | ORDER BY date |
| message.is_read | Unread message filtering | WHERE is_read = FALSE |
| chat.PID1, PID2 | Chat lookups | Conversation retrieval |

**Total Indexes:** 38 (primary keys + 33 secondary)

---

## Scalability Considerations

### Current Deployment
- Single MySQL 8.0+ instance
- Supports 100K+ players, 50K+ games
- Storage: ~500MB-1GB typical

### Scaling Strategies (If Needed)

1. **Replication** (Read-Heavy)
   - Master → Multiple read replicas
   - Distribute SELECT queries across replicas
   - Writes still go to master

2. **Partitioning** (Very Large Tables)
   - GAME_HISTORY partitioned by GAME_ID range
   - MESSAGE partitioned by DATE
   - Improves query speed on huge tables

3. **Archival** (Historical Data)
   - Move old games/messages to archive schema
   - Keep "hot" data in main schema
   - Quarterly archival process

4. **Caching Layer** (Frequently Queried Data)
   - Cache leaderboard (memcached/Redis)
   - Cache player profiles
   - 15-30 min TTL

---

## Backup & Recovery

### Backup Strategy
- **Daily full backups** via mysqldump
- **Hourly incremental** via binary logs (if enabled)
- **Off-site storage** (3x redundancy)
- **Retention:** 30 days full + 7 days incremental

### Recovery Procedure
1. Restore latest full backup
2. Replay binary logs to point-in-time
3. Validate referential integrity (sp_validate_restore)
4. Test before promoting to production

### Critical Paths
- **Player accounts:** HIGH priority (irreplaceable)
- **Game results:** MEDIUM priority (can re-record)
- **Leaderboard snapshots:** LOW priority (can regenerate)

---

## Operational Procedures

### Daily Tasks
```
- Monitor database size
- Check for locks/slow queries
- Verify backup completion
- Review error logs
```

### Weekly Tasks
```
- Analyze table statistics
- Rebuild indexes if needed
- Generate leaderboard snapshots
- Archive old notifications (>30 days)
```

### Monthly Tasks
```
- Full backup integrity check
- Capacity planning review
- Performance baseline update
- Archive old games (optional)
```

---

## Security Considerations

### Access Control
- Application connects as limited-privilege user (NOT root)
- User can only access game_tournament_db
- Sensitive queries require explicit GRANT

### Data Protection
- Password hashes (bcrypt, NOT plaintext)
- Encrypted connections (TLS/SSL) for remote access
- Audit logging for sensitive operations (DELETE, UPDATE on PLAYER)

### Compliance
- GDPR: Support data export, right-to-be-forgotten (soft delete)
- CCPA: Player data can be retrieved via sp_get_player_stats
- PCI (if payments): Separate service; DB doesn't store credit cards

---

## Monitoring & Alerts

### Key Metrics
- **Query Response Time:** <100ms for typical queries
- **Disk Usage:** Monitor growth rate, alert at 80%
- **Connection Pool:** Alert if >80% in use
- **Replication Lag:** Alert if >10 seconds behind master

### Alerting
- Automated slack/email if:
  - Backup fails
  - Disk space >80%
  - Query time >500ms
  - Replication lag >10s

---

## Testing & Validation

### Unit Tests
- Run before each deployment
- Test all stored procedures
- Test all triggers with edge cases
- Validate constraints

### Integration Tests
- End-to-end game creation → result → leaderboard update
- Friend request → message → notification flow
- Tournament enrollment → game participation flow

### Performance Tests
- Load test with 10K concurrent connections
- Benchmark leaderboard query (<100ms target)
- Stress test game move insertion

---

## Documentation & Training

### For Developers
- Review data_dictionary.md for schema
- Study sample_queries.sql for common patterns
- Use procedures for business logic (NOT raw SQL)

### For DBAs
- Follow backup_restore.sql procedures
- Monitor via database_statistics view
- Alert thresholds defined in monitoring section

### For Application Teams
- Use views instead of raw tables
- Call procedures instead of raw INSERT/UPDATE
- Always use parameterized queries (prevent SQL injection)
