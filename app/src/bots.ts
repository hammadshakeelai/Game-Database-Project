/**
 * The bot roster.
 *
 * These are real, playable opponents, not decoration. Every one of them is
 * clearly a bot everywhere it appears: the lobby lists them under "Computer
 * opponents", the game room labels them, and a game against one never writes a
 * player-versus-player record or moves a rating.
 *
 * `level` is minimax search depth. `rating` is indicative only, so a player can
 * pick an opponent roughly at their strength; it is not an Elo the bot earns.
 *
 * Shared by client and server so the name shown in the lobby is the name shown
 * across the board.
 */

export interface BotProfile {
  id: string;
  name: string;
  level: number;
  rating: number;
  blurb: string;
}

export const BOTS: BotProfile[] = [
  {
    id: 'pip',
    name: 'Pip',
    level: 1,
    rating: 700,
    blurb: 'Plays the first square that looks fine. Good for learning the rule.',
  },
  {
    id: 'nell',
    name: 'Nell',
    level: 1,
    rating: 850,
    blurb: 'Takes the obvious square and little else.',
  },
  {
    id: 'ozzy',
    name: 'Ozzy',
    level: 2,
    rating: 1000,
    blurb: 'Sees the move directly in front of it.',
  },
  {
    id: 'juno',
    name: 'Juno',
    level: 2,
    rating: 1120,
    blurb: 'Will take a sub-board if you leave one hanging.',
  },
  {
    id: 'rex',
    name: 'Rex',
    level: 3,
    rating: 1290,
    blurb: 'Looks a few moves ahead. A fair fight for most people.',
  },
  {
    id: 'mira',
    name: 'Mira',
    level: 3,
    rating: 1380,
    blurb: 'Thinks about where it is sending you, not just where it plays.',
  },
  {
    id: 'kade',
    name: 'Kade',
    level: 4,
    rating: 1550,
    blurb: 'Punishes a loose square. You will need a plan.',
  },
  {
    id: 'sable',
    name: 'Sable',
    level: 4,
    rating: 1680,
    blurb: 'Sets traps two boards away.',
  },
  {
    id: 'vex',
    name: 'Vex',
    level: 5,
    rating: 1850,
    blurb: 'Searches deep and does not blunder. Good luck.',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    level: 5,
    rating: 2000,
    blurb: 'The strongest thing here. Beating it means something.',
  },
];

const BY_ID = new Map(BOTS.map(b => [b.id, b]));

export function findBot(id: unknown): BotProfile | null {
  return typeof id === 'string' ? (BY_ID.get(id) ?? null) : null;
}

/** Bots grouped by level, for a lobby list that reads as a ladder. */
export const BOT_TIERS: { label: string; blurb: string; bots: BotProfile[] }[] = [
  {
    label: 'Learning',
    blurb: 'Start here if the rule is new',
    bots: BOTS.filter(b => b.level === 1),
  },
  { label: 'Casual', blurb: 'Knows what it is doing', bots: BOTS.filter(b => b.level === 2) },
  { label: 'Club', blurb: 'A fair fight', bots: BOTS.filter(b => b.level === 3) },
  { label: 'Strong', blurb: 'Will punish mistakes', bots: BOTS.filter(b => b.level === 4) },
  { label: 'Expert', blurb: 'Searches deep', bots: BOTS.filter(b => b.level === 5) },
];
