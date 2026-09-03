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
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

/** Every player starts here; the scale is conventional so the number reads as a rating. */
export const STARTING_ELO = 1200;

/**
 * K-factor: how far a single result can move a rating. New players move fast so
 * they reach their true level quickly, established players move slowly so one
 * bad night does not erase a season.
 */
function kFactor(matchesPlayed: number): number {
  if (matchesPlayed < 10) return 40;
  if (matchesPlayed < 30) return 24;
  return 16;
}

/** Standard Elo expectation for `rating` against `opponent`. */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/** New rating after scoring `score` (1 win, 0.5 draw, 0 loss) against `opponent`. */
export function nextElo(
  rating: number,
  opponent: number,
  score: number,
  matchesPlayed: number,
): number {
  return Math.round(rating + kFactor(matchesPlayed) * (score - expectedScore(rating, opponent)));
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
        elo: STARTING_ELO,
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
    const finishedAt = match.finishedAt ?? Date.now();

    // Ratings and stats are read-modify-write across two documents, so they run
    // in a transaction: two games finishing at once must not lose an update.
    const ratings = await db.runTransaction(async tx => {
      const xRef = db.collection('users').doc(x.uid);
      const oRef = db.collection('users').doc(o.uid);
      const [xSnap, oSnap] = await tx.getAll(xRef, oRef);

      const xBefore = (xSnap.data()?.elo as number) ?? STARTING_ELO;
      const oBefore = (oSnap.data()?.elo as number) ?? STARTING_ELO;
      const xPlayed = (xSnap.data()?.matchesPlayed as number) ?? 0;
      const oPlayed = (oSnap.data()?.matchesPlayed as number) ?? 0;

      const xScore = winner === 'Draw' ? 0.5 : winner === 'X' ? 1 : 0;
      const xAfter = nextElo(xBefore, oBefore, xScore, xPlayed);
      const oAfter = nextElo(oBefore, xBefore, 1 - xScore, oPlayed);

      tx.set(
        xRef,
        {
          elo: xAfter,
          matchesPlayed: FieldValue.increment(1),
          [outcomeFor('X', winner)]: FieldValue.increment(1),
        },
        { merge: true },
      );
      tx.set(
        oRef,
        {
          elo: oAfter,
          matchesPlayed: FieldValue.increment(1),
          [outcomeFor('O', winner)]: FieldValue.increment(1),
        },
        { merge: true },
      );

      return { xBefore, xAfter, oBefore, oAfter };
    });

    await db
      .collection('match_records')
      .doc(match.id)
      .set({
        playerX: x.uid,
        playerO: o.uid,
        playerXName: x.name,
        playerOName: o.name,
        playerXPhoto: x.photoURL,
        playerOPhoto: o.photoURL,
        winner,
        reason: match.result.reason,
        movesCount: match.state.moves.length,
        // The full move list, so the game can be replayed and reviewed later.
        // A finished board is at most 81 moves, far inside the 1MB document cap.
        moves: match.state.moves.map(m => ({
          s: m.superGridIndex,
          c: m.subGridIndex,
          p: m.player,
        })),
        eloBefore: { X: ratings.xBefore, O: ratings.oBefore },
        eloAfter: { X: ratings.xAfter, O: ratings.oAfter },
        createdAt: match.createdAt,
        finishedAt,
      });
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
      db
        .collection('match_records')
        .where('playerX', '==', uid)
        .orderBy('finishedAt', 'desc')
        .limit(limit)
        .get(),
      db
        .collection('match_records')
        .where('playerO', '==', uid)
        .orderBy('finishedAt', 'desc')
        .limit(limit)
        .get(),
    ]);

    const rows = [...asX.docs, ...asO.docs].map(doc => {
      const d = doc.data();
      const mark: Mark = d.playerX === uid ? 'X' : 'O';
      const winner = d.winner as Mark | 'Draw';
      return {
        id: doc.id,
        opponentName: mark === 'X' ? d.playerOName : d.playerXName,
        outcome:
          winner === 'Draw'
            ? ('draw' as const)
            : winner === mark
              ? ('win' as const)
              : ('loss' as const),
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
