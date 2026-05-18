import { Link } from 'react-router-dom';
import { getUserProfile } from '../stores';
import { calcWinRate } from '../utils';

interface Props {
  opponentUid: string | null;
}

/**
 * Compact opponent profile card shown in the game-room header.
 * Looks the opponent up in the local seeded users blob.
 * Renders nothing for bot matches (uid 'BOT' / empty).
 */
export default function OpponentCard({ opponentUid }: Props) {
  if (!opponentUid || opponentUid === 'BOT') return null;
  const profile = getUserProfile(opponentUid);

  const name = profile?.username ?? 'Unknown Player';
  const elo = profile?.elo_rating ?? '—';
  const matches = profile?.matches_played ?? 0;
  const wr = profile ? calcWinRate(profile.wins, profile.matches_played) : 0;

  return (
    <Link
      to={`/profile/${opponentUid}`}
      title="View opponent profile"
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-indigo-500/50 transition-colors max-w-[260px]"
    >
      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
        {name[0]?.toUpperCase() ?? '?'}
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-white truncate leading-tight">{name}</span>
        <span className="text-[11px] text-slate-400 font-mono leading-tight">
          Elo {elo} · {wr}% WR · {matches}g
        </span>
      </div>
    </Link>
  );
}
