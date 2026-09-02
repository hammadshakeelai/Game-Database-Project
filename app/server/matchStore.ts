import { createInitialState } from '../src/gameLogic.js';
import type { GameState } from '../src/types.js';

export type Mark = 'X' | 'O';
export type MatchMode = 'pvp' | 'bot';
export type MatchStatus = 'waiting' | 'active' | 'finished';
export type Role = Mark | 'spectator';

export interface MatchPlayer {
  uid: string;
  name: string;
  photoURL: string | null;
  /** Current socket id, or null while the player is disconnected. */
  socketId: string | null;
  /** When the player last disconnected; used to distinguish a refresh from a walk-out. */
  disconnectedAt: number | null;
}

export interface Match {
  id: string;
  /** Short shareable code. Equal to `id` — the id *is* the code. */
  mode: MatchMode;
  botDifficulty: number;
  status: MatchStatus;
  state: GameState;
  players: { X: MatchPlayer | null; O: MatchPlayer | null };
  /** Set when the game ends, so late joiners and refreshes still see the result. */
  result: { winner: Mark | 'Draw'; reason: 'line' | 'draw' | 'resign' | 'agreement' } | null;
  /** Which mark has an outstanding draw offer, if any. */
  drawOfferedBy: Mark | null;
  /** Which marks have asked for a rematch. Both required before a new game starts. */
  rematchRequestedBy: Set<Mark>;
  /** Id of the match created by an accepted rematch, so both clients follow the same link. */
  rematchMatchId: string | null;
  createdAt: number;
  lastActivity: number;
  finishedAt: number | null;
  /** True once results have been persisted, to make persistence idempotent. */
  recorded: boolean;
}

/**
 * Room codes use an unambiguous alphabet: no O/0, I/1, or similar look-alikes,
 * because these get read aloud and typed from a phone screen.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Finished matches stay in memory this long so refresh and rematch still work. */
export const FINISHED_RETENTION_MS = 10 * 60 * 1000;
/** Unfinished matches nobody has touched are reaped after this long. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** A disconnected player has this long to come back before they forfeit. */
export const RECONNECT_GRACE_MS = 60 * 1000;

export class MatchStore {
  private matches = new Map<string, Match>();

  /** Generate a code that is not already in use. */
  private generateCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.matches.has(code)) return code;
    }
    // Astronomically unlikely; fall back to something guaranteed unique.
    return `${Date.now().toString(36).toUpperCase()}`;
  }

  create(opts: {
    host: Omit<MatchPlayer, 'disconnectedAt'>;
    mode: MatchMode;
    botDifficulty?: number;
    /** Host plays X by default; a rematch swaps so both players get to start. */
    hostMark?: Mark;
    id?: string;
  }): Match {
    const id = opts.id ?? this.generateCode();
    const hostMark: Mark = opts.hostMark ?? 'X';
    const host: MatchPlayer = { ...opts.host, disconnectedAt: null };

    const bot: MatchPlayer | null =
      opts.mode === 'bot'
        ? { uid: 'BOT', name: 'Computer', photoURL: null, socketId: null, disconnectedAt: null }
        : null;

    const match: Match = {
      id,
      mode: opts.mode,
      botDifficulty: opts.botDifficulty ?? 3,
      status: opts.mode === 'bot' ? 'active' : 'waiting',
      state: createInitialState(),
      players: {
        X: hostMark === 'X' ? host : bot,
        O: hostMark === 'X' ? bot : host,
      },
      result: null,
      drawOfferedBy: null,
      rematchRequestedBy: new Set(),
      rematchMatchId: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      finishedAt: null,
      recorded: false,
    };

    this.matches.set(id, match);
    return match;
  }

  /**
   * Look up a match by code.
   *
   * Codes are generated and displayed uppercase, but they travel through URLs
   * and get typed by hand, so every lookup normalises. Doing it here rather
   * than at each call site is what stops a lowercase invite link from joining
   * successfully and then failing on the first move.
   */
  get(id: string): Match | undefined {
    if (typeof id !== 'string') return undefined;
    return this.matches.get(id.toUpperCase());
  }

  delete(id: string): void {
    this.matches.delete(id.toUpperCase());
  }

  all(): Match[] {
    return [...this.matches.values()];
  }

  get size(): number {
    return this.matches.size;
  }

  /** The mark this uid plays in this match, or null if they are not a player. */
  markOf(match: Match, uid: string): Mark | null {
    if (match.players.X?.uid === uid) return 'X';
    if (match.players.O?.uid === uid) return 'O';
    return null;
  }

  roleOf(match: Match, uid: string): Role {
    return this.markOf(match, uid) ?? 'spectator';
  }

  touch(match: Match): void {
    match.lastActivity = Date.now();
  }

  /**
   * Reap matches that are finished-and-stale or simply abandoned.
   * Returns the ids removed, so the caller can notify any lingering sockets.
   */
  reap(now = Date.now()): string[] {
    const removed: string[] = [];
    for (const [id, match] of this.matches) {
      const finishedTooLongAgo =
        match.status === 'finished' &&
        match.finishedAt !== null &&
        now - match.finishedAt > FINISHED_RETENTION_MS;
      const idle = now - match.lastActivity > IDLE_TIMEOUT_MS;

      if (finishedTooLongAgo || idle) {
        this.matches.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }
}
