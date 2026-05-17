# Performance Optimization Guide

## Index Strategy & Query Performance

### Existing Indexes (38 total)

```sql
-- Primary Keys (Auto-indexed)
- player(PID), gametype(GT_ID), tournament(TID), game(game_ID), etc.

-- Foreign Key Indexes (20+)
- tournament(struct_ID, game_type_ID, organizer_PID)
- participant(TID, PID)
- game_player(game_ID, PID)
- game_move(game_ID, actor_PID)
- game_history(PID, GAME_ID)
- group_list(GID, PID)
- friends(PID1, PID2)
- chat(PID1, PID2)
- message(CID, sender_PID)
- notification(recipient_PID)

-- Search Indexes (13)
- player(rank_elo DESC) -- leaderboard queries
- player(email) -- login queries
- player(is_active) -- filter active players
- player(created_at) -- date range queries
- game(game_type_ID, status) -- composite: filter by type + status
- tournament(scheduled_at) -- upcoming tournaments
- message(is_read) -- unread message count
- leaderboard(rank_position) -- top N players
- notification(created_at) -- recent notifications
- gametype(type_name) -- game lookup
- structure(format_type) -- tournament format lookup
- group_t(group_name) -- group search
- chat(last_message_at) -- recent chats
```

---

## Query Performance Benchmarks

### Expected Response Times

| Query | Target | Notes |
|-------|--------|-------|
| Get player by ID | <10ms | Simple PK lookup |
| Leaderboard top 100 | <100ms | ORDER BY rank_elo, LIMIT 100 |
| Player match history (last 20) | <50ms | Join game + game_history, LIMIT 20 |
| Tournament standings | <200ms | GROUP BY participant + leaderboard |
| Chat messages (1 convo) | <25ms | Indexed by CID, simple select |
| Unread notifications | <50ms | WHERE is_read = FALSE + INDEX |
| Friends list | <30ms | Simple join friends table |
| Group members | <40ms | GROUP BY group_list |

### Slow Query Log Configuration
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5;  -- Log queries >500ms
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

---

## Common Query Optimization Techniques

### 1. Use Appropriate Indexes
```sql
-- ✓ GOOD: Uses index on rank_elo
SELECT PID, first_name, rank_elo FROM player ORDER BY rank_elo DESC LIMIT 100;

-- ✗ BAD: No index on computed column
SELECT PID, first_name, rank_elo * 1.1 AS adjusted_elo FROM player ORDER BY rank_elo * 1.1;
```

### 2. Filter Before Join
```sql
-- ✓ GOOD: Filter first, then join
SELECT gh.* FROM game_history gh
JOIN player p ON gh.PID = p.PID
WHERE gh.result = 'win' AND p.is_active = TRUE;

-- ✗ SLOW: Join all, then filter
SELECT * FROM game_history gh
JOIN player p ON gh.PID = p.PID
WHERE gh.result = 'win' AND p.is_active = TRUE;
```

### 3. Use LIMIT to Avoid Full Table Scan
```sql
-- ✓ GOOD: Get top N
SELECT * FROM leaderboard ORDER BY rank_position LIMIT 10;

-- ✗ SLOW: Get all ranks
SELECT * FROM leaderboard ORDER BY rank_position;
```

### 4. Aggregate in Database, Not Application
```sql
-- ✓ GOOD: Count wins in SQL
SELECT SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS win_count
FROM game_history WHERE PID = 'P001';

-- ✗ SLOW: Fetch all, count in application
SELECT * FROM game_history WHERE PID = 'P001';  -- Then count in code
```

### 5. Use Covering Indexes for SELECT
```sql
-- If you often query (PID, result) without needing other columns
CREATE INDEX idx_game_history_covering ON game_history(PID, result);

-- Now this query uses only index (no table access)
SELECT PID, result FROM game_history WHERE PID = 'P001';
```

---

## Denormalization Strategy

### Leaderboard Denormalization
The LEADERBOARD table is denormalized for performance:

```sql
-- Without denormalization (slow): Calculate rankings on every query
SELECT p.PID, p.rank_elo, ROW_NUMBER() OVER (ORDER BY rank_elo DESC) AS rank
FROM player p
WHERE is_active = TRUE
ORDER BY rank_elo DESC LIMIT 100;

-- With denormalization (fast): Pre-calculated snapshots
SELECT * FROM leaderboard WHERE scope = 'global' ORDER BY rank_position LIMIT 100;
```

**Trade-off:** Storage (+10KB) for query speed (+100x faster).

**Update Strategy:** Regenerate leaderboard snapshots:
- Hourly: After major tournaments
- Daily: Standard refresh
- Trigger: After manual Elo correction

---

## Partitioning Strategy (If Scaling Beyond 50M Rows)

### Partition GAME_HISTORY by Date Range
```sql
-- Store yearly partitions
ALTER TABLE game_history PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

**Benefit:** Query on 2024 data doesn't scan 2023 data.

### Partition MESSAGE by Date Range
```sql
ALTER TABLE message PARTITION BY RANGE (YEAR(sent_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026)
);
```

---

## Caching Strategy

### Query Results to Cache (Redis/Memcached)

| Data | TTL | Reason |
|------|-----|--------|
| Leaderboard top 100 | 1 hour | Frequently accessed, slowly changing |
| Player profile | 30 min | Stable data, high read volume |
| Game details | Never (or 24h) | Immutable after completion |
| Chat list (per user) | 5 min | Changes when messages arrive |
| Notification count | 1 min | User checks frequently |

### Example Cache Pattern
```python
# In application code (pseudo-code)
def get_leaderboard():
    cache_key = "leaderboard:global:top100"
    result = cache.get(cache_key)
    
    if result is None:
        result = db.query("SELECT * FROM leaderboard WHERE scope='global' LIMIT 100")
        cache.set(cache_key, result, ttl=3600)  # Cache for 1 hour
    
    return result
```

---

## Connection Pooling

### Recommended Pool Size
```
pool_min_size = 5
pool_max_size = 20
pool_idle_timeout = 900  -- 15 minutes
```

### Why Pool?
- Avoid connection overhead (TCP handshake, auth)
- Reuse existing connections
- Limit max concurrent connections

---

## Query Execution Plan Analysis

### Use EXPLAIN to Analyze
```sql
-- Analyze query before optimizing
EXPLAIN SELECT * FROM player p
JOIN game_history gh ON p.PID = gh.PID
WHERE gh.result = 'win' ORDER BY p.rank_elo DESC LIMIT 10;
```

**Look for:**
- **type:** ALL = table scan (bad), index = index scan (good), const = instant (best)
- **key:** Which index is used (NULL = no index)
- **rows:** How many rows examined
- **Extra:** Using filesort/temporary table (red flags)

### Optimization Example
```sql
-- BEFORE (slow): Full table scan
EXPLAIN SELECT * FROM player WHERE rank_elo > 1500 ORDER BY rank_elo DESC;
-- Result: type=ALL, rows=100

-- AFTER (fast): Index scan
CREATE INDEX idx_player_rank_elo ON player(rank_elo DESC);
EXPLAIN SELECT * FROM player WHERE rank_elo > 1500 ORDER BY rank_elo DESC;
-- Result: type=range, key=idx_player_rank_elo, rows=20 (much better!)
```

---

## Batch Operations

### Bulk Insert (vs single inserts)
```sql
-- ✓ GOOD: Single INSERT with multiple VALUES (10-100x faster)
INSERT INTO player (PID, first_name, last_name, email, rank_elo)
VALUES ('P101', 'Alice', 'Smith', 'alice@example.com', 1200),
       ('P102', 'Bob', 'Jones', 'bob@example.com', 1400),
       ('P103', 'Carol', 'Brown', 'carol@example.com', 1600);

-- ✗ SLOW: Individual inserts
INSERT INTO player (...) VALUES ('P101', ...);
INSERT INTO player (...) VALUES ('P102', ...);
INSERT INTO player (...) VALUES ('P103', ...);
```

### Bulk Update
```sql
-- ✓ GOOD: Update multiple rows at once
UPDATE player SET rank_elo = rank_elo + 50 WHERE PID IN ('P001', 'P002', 'P003');

-- ✗ SLOW: Update one by one
UPDATE player SET rank_elo = rank_elo + 50 WHERE PID = 'P001';
UPDATE player SET rank_elo = rank_elo + 50 WHERE PID = 'P002';
```

---

## Monitoring & Tuning

### Key Metrics to Monitor
```sql
-- Database size
SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS db_size_mb
FROM information_schema.tables WHERE table_schema = 'game_tournament_db';

-- Slow queries
SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;

-- Table statistics
SELECT object_schema, object_name, count_read, count_write
FROM performance_schema.table_io_waits_summary_by_table;

-- Index usage
SELECT object_schema, object_name, index_name, count_read, count_insert
FROM performance_schema.table_io_waits_summary_by_index_usage;
```

### Common Bottlenecks & Solutions
| Symptom | Cause | Solution |
|---------|-------|----------|
| Slow leaderboard query | No index on rank_elo | Add index or use LEADERBOARD view |
| Slow friend lookups | JOIN friends table | Use indexed PID columns |
| Chat messages slow | Message table too large | Partition by date or archive old |
| Unread notification count slow | Full table scan | Add index on is_read |

---

## Best Practices Summary

1. **Always use views/procedures** for complex queries
2. **Index foreign keys** and frequently searched columns
3. **Use LIMIT** to reduce result sets
4. **Aggregate in database**, not application
5. **Denormalize sparingly** (leaderboard justified)
6. **Cache frequently accessed data** (Redis/Memcached)
7. **Batch operations** (inserts, updates)
8. **Monitor slow queries** regularly
9. **Use connection pooling**
10. **Analyze EXPLAIN plans** before optimizing
