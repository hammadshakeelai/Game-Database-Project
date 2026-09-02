import { FieldValue } from 'firebase-admin/firestore';
import { adminConfigured, adminDb } from './firebaseAdmin.js';
import type { Match, Mark } from './matchStore.js';

/**
 * Firestore persistence. Only the server writes results, which is what lets the
 * security rules deny all client writes to stats and match records.
 *
 * Every function here is best-effort: a Firestore outage must not take down a
 * game that is otherwise playable, so failures are logged and swallowed.
 */

export interface StoredProfile {
  displayName: string;
  photoURL: string | null;
  createdAt: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

/** Create the profile document on first sign-in; refresh name/photo after that. */
export async function ensureProfile(user: {
  uid: string;
  name: string;
  picture: string | null;
}): Promise<void> {
  if (!adminConfigured) return;
  try {
    const ref = adminDb().collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        displayName: user.name,
        photoURL: user.picture,
        createdAt: Date.now(),
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      });
    } else {
      // Keep the denormalised display fields in step with the Google account.
      await ref.update({ displayName: user.name, photoURL: user.picture });
    }
  } catch (err) {
    console.error('[persistence] ensureProfile failed:', (err as Error).message);
  }
}

export async function getProfile(uid: string): Promise<StoredProfile | null> {
  if (!adminConfigured) return null;
  try {
    const snap = await adminDb().collection('users').doc(uid).get();
    return snap.exists ? (snap.data() as StoredProfile) : null;
  } catch (err) {
    console.error('[persistence] getProfile failed:', (err as Error).message);
    return null;
  }
}

/**
 * Record a finished match and update both players' aggregate stats.
 *
 * Bot matches are deliberately NOT recorded as player-versus-player results.
 * The previous implementation reported bot games as PvP so that ratings would
 * move, which fabricated match history against players who did not exist.
 */
export async function recordMatch(match: Match): Promise<void> {
  if (!adminConfigured) return;
  if (match.mode !== 'pvp') return;
  if (!match.result) return;
  if (match.recorded) return;

  const x = match.players.X;
  const o = match.players.O;
  if (!x || !o) return;

  match.recorded = true;

  try {
    const db = adminDb();
    const winner = match.result.winner;

    await db.collection('match_records').doc(match.id).set({
      playerX: x.uid,
      playerO: o.uid,
      playerXName: x.name,
      playerOName: o.name,
      winner,
      reason: match.result.reason,
      movesCount: match.state.moves.length,
      createdAt: match.createdAt,
      finishedAt: match.finishedAt ?? Date.now(),
    });

    await Promise.all([
      bumpStats(x.uid, outcomeFor('X', winner)),
      bumpStats(o.uid, outcomeFor('O', winner)),
    ]);
  } catch (err) {
    // Allow a later attempt if the write failed outright.
    match.recorded = false;
    console.error('[persistence] recordMatch failed:', (err as Error).message);
  }
}

type Outcome = 'wins' | 'losses' | 'draws';

function outcomeFor(mark: Mark, winner: Mark | 'Draw'): Outcome {
  if (winner === 'Draw') return 'draws';
  return winner === mark ? 'wins' : 'losses';
}

async function bumpStats(uid: string, outcome: Outcome): Promise<void> {
  await adminDb()
    .collection('users')
    .doc(uid)
    .set(
      { matchesPlayed: FieldValue.increment(1), [outcome]: FieldValue.increment(1) },
      { merge: true },
    );
}

export interface RecentMatch {
  id: string;
  opponentName: string;
  outcome: 'win' | 'loss' | 'draw';
  movesCount: number;
  finishedAt: number;
}

/** Recent finished matches for a player, newest first. */
export async function getRecentMatches(uid: string, limit = 10): Promise<RecentMatch[]> {
  if (!adminConfigured) return [];
  try {
    const db = adminDb();
    // Firestore has no OR across fields, so query both sides and merge.
    const [asX, asO] = await Promise.all([
      db.collection('match_records').where('playerX', '==', uid)
        .orderBy('finishedAt', 'desc').limit(limit).get(),
      db.collection('match_records').where('playerO', '==', uid)
        .orderBy('finishedAt', 'desc').limit(limit).get(),
    ]);

    const rows = [...asX.docs, ...asO.docs].map(doc => {
      const d = doc.data();
      const mark: Mark = d.playerX === uid ? 'X' : 'O';
      const winner = d.winner as Mark | 'Draw';
      return {
        id: doc.id,
        opponentName: mark === 'X' ? d.playerOName : d.playerXName,
        outcome:
          winner === 'Draw' ? ('draw' as const) : winner === mark ? ('win' as const) : ('loss' as const),
        movesCount: d.movesCount as number,
        finishedAt: d.finishedAt as number,
      };
    });

    return rows.sort((a, b) => b.finishedAt - a.finishedAt).slice(0, limit);
  } catch (err) {
    console.error('[persistence] getRecentMatches failed:', (err as Error).message);
    return [];
  }
}

export interface LeaderboardRow {
  uid: string;
  displayName: string;
  photoURL: string | null;
  wins: number;
  matchesPlayed: number;
}

export async function getLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  if (!adminConfigured) return [];
  try {
    const snap = await adminDb()
      .collection('users')
      .orderBy('wins', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        uid: doc.id,
        displayName: d.displayName ?? 'Player',
        photoURL: d.photoURL ?? null,
        wins: d.wins ?? 0,
        matchesPlayed: d.matchesPlayed ?? 0,
      };
    });
  } catch (err) {
    console.error('[persistence] getLeaderboard failed:', (err as Error).message);
    return [];
  }
}
