import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { Spinner } from '../components/Spinner';
import { cn } from '../utils';

interface Row {
  uid: string;
  displayName: string;
  photoURL: string | null;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
}

/**
 * Standings.
 *
 * A table, because that is what a standings page is. Density is the point: the
 * comparison between rows is the content, so nothing here animates or floats.
 */
export default function LeaderboardPage() {
  const { getToken, user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/leaderboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { rows: Row[] };
        if (!cancelled) setRows(data.rows);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <AppShell title="Ratings">
      <h1 className="ttt-display mb-1 text-2xl font-semibold text-slate-100">Standings</h1>
      <p className="mb-6 text-sm text-slate-400">
        Ranked by rating. Everyone starts at 1200; only finished games against people count.
      </p>

      {failed && (
        <p role="alert" className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-200">
          Could not load the standings. Please try again in a moment.
        </p>
      )}

      {!failed && rows === null && <Spinner label="Loading standings" />}

      {rows !== null && rows.length === 0 && (
        <p className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-6 text-center text-sm text-slate-400">
          No games have been finished yet. Play one and you will be first.
        </p>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="sr-only">Players ranked by rating</caption>
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/70 text-left">
                <th scope="col" className="w-12 px-3 py-2.5 font-medium text-slate-400">
                  #
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium text-slate-400">
                  Player
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium text-slate-400">
                  Rating
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium text-slate-400">
                  W / L / D
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const you = row.uid === user?.uid;
                return (
                  <tr
                    key={row.uid}
                    className={cn(
                      'border-b border-slate-700/50 last:border-0',
                      you && 'bg-indigo-500/10',
                    )}
                  >
                    <td className="ttt-notation px-3 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/players/${row.uid}`}
                        className="flex items-center gap-2.5 text-slate-200 hover:text-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                      >
                        {row.photoURL ? (
                          <img
                            src={row.photoURL}
                            alt=""
                            className="h-7 w-7 shrink-0 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                            {row.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate">{row.displayName}</span>
                        {you && <span className="text-xs text-slate-500">(you)</span>}
                      </Link>
                    </td>
                    <td className="ttt-notation px-3 py-2.5 text-right font-semibold text-indigo-300">
                      {row.elo}
                    </td>
                    <td className="ttt-notation px-3 py-2.5 text-right text-slate-400">
                      <span className="text-emerald-300">{row.wins}</span>
                      {' / '}
                      <span className="text-rose-300">{row.losses}</span>
                      {' / '}
                      {row.draws}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
