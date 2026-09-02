import { describe, expect, it } from 'vitest';
import {
  FINISHED_RETENTION_MS,
  IDLE_TIMEOUT_MS,
  MatchStore,
  type Match,
} from '../../server/matchStore.js';

/** A host with the shape the store expects. */
function host(uid: string, name = uid) {
  return { uid, name, photoURL: null, socketId: `socket-${uid}` };
}

function seat(match: Match, mark: 'X' | 'O', uid: string) {
  match.players[mark] = {
    uid,
    name: uid,
    photoURL: null,
    socketId: `socket-${uid}`,
    disconnectedAt: null,
  };
}

describe('creating matches', () => {
  it('issues a six-character code from an unambiguous alphabet', () => {
    const store = new MatchStore();
    for (let i = 0; i < 40; i++) {
      const match = store.create({ mode: 'pvp', host: host(`u${i}`) });
      // No O/0/I/1 — these get read aloud and typed from a phone screen.
      expect(match.id).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('issues distinct codes', () => {
    const store = new MatchStore();
    const codes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      codes.add(store.create({ mode: 'pvp', host: host(`u${i}`) }).id);
    }
    expect(codes.size).toBe(200);
  });

  it('seats a pvp host as X and leaves O open, waiting', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    expect(match.status).toBe('waiting');
    expect(match.players.X?.uid).toBe('alice');
    expect(match.players.O).toBeNull();
  });

  it('seats the computer as the opponent and starts immediately in bot mode', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'bot', host: host('alice') });
    expect(match.status).toBe('active');
    expect(match.players.O?.uid).toBe('BOT');
  });

  it('clamps nothing but honours an explicit host mark', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('bob'), hostMark: 'X' });
    expect(match.players.X?.uid).toBe('bob');
  });
});

describe('code lookup', () => {
  it('is case-insensitive, so a lower-case invite link resolves', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    expect(store.get(match.id.toLowerCase())?.id).toBe(match.id);
    expect(store.get(match.id)?.id).toBe(match.id);
  });

  it('returns undefined for an unknown code rather than creating one', () => {
    const store = new MatchStore();
    expect(store.get('ZZZZZZ')).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it('deletes case-insensitively too', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    store.delete(match.id.toLowerCase());
    expect(store.get(match.id)).toBeUndefined();
  });
});

describe('roles', () => {
  it('reports the mark for each player and spectator for anyone else', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    seat(match, 'O', 'bob');

    expect(store.markOf(match, 'alice')).toBe('X');
    expect(store.markOf(match, 'bob')).toBe('O');
    expect(store.markOf(match, 'carol')).toBeNull();
    expect(store.roleOf(match, 'carol')).toBe('spectator');
  });
});

describe('reaping', () => {
  it('keeps a freshly finished match so refresh and rematch still work', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    match.status = 'finished';
    match.finishedAt = Date.now();

    expect(store.reap()).toEqual([]);
    expect(store.get(match.id)).toBeDefined();
  });

  it('removes a finished match once its retention window has passed', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    const now = Date.now();
    match.status = 'finished';
    match.finishedAt = now;
    match.lastActivity = now;

    const removed = store.reap(now + FINISHED_RETENTION_MS + 1000);
    expect(removed).toEqual([match.id]);
    expect(store.get(match.id)).toBeUndefined();
  });

  it('removes an abandoned match nobody has touched', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    const removed = store.reap(Date.now() + IDLE_TIMEOUT_MS + 1000);
    expect(removed).toEqual([match.id]);
  });

  it('keeps an active match that is still being played', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    seat(match, 'O', 'bob');
    match.status = 'active';

    // Simulate a move well after creation.
    const later = Date.now() + IDLE_TIMEOUT_MS * 2;
    match.lastActivity = later;
    expect(store.reap(later + 1000)).toEqual([]);
  });

  it('touch keeps a match alive', () => {
    const store = new MatchStore();
    const match = store.create({ mode: 'pvp', host: host('alice') });
    match.lastActivity = Date.now() - IDLE_TIMEOUT_MS - 5000;
    store.touch(match);
    expect(store.reap()).toEqual([]);
  });
});
