import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import PageShell from '../components/PageShell';
import {
  acceptFriendRequest,
  getFriendStatus,
  listAcceptedFriends,
  listAllUsers,
  listIncomingRequests,
  removeFriend,
  sendFriendRequest,
} from '../stores';
import { cn, formatDate } from '../utils';

export default function FriendsPage() {
  const { user } = useAuth();
  const me = user?.uid ?? '';

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  useEffect(() => {
    window.addEventListener('friends-updated', refresh);
    return () => window.removeEventListener('friends-updated', refresh);
  }, []);

  const incoming = useMemo(() => listIncomingRequests(me), [me, tick]);
  const accepted = useMemo(() => listAcceptedFriends(me), [me, tick]);
  const allUsers = useMemo(() => listAllUsers().filter(u => u.uid !== me && u.profile), [me, tick]);

  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allUsers
      .filter(u => u.profile?.username.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allUsers]);

  const handleSend = (toUid: string) => {
    const r = sendFriendRequest(me, toUid);
    setFeedback(r.ok ? { kind: 'ok', text: 'Friend request sent.' } : { kind: 'err', text: r.reason ?? 'Could not send.' });
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <PageShell title="Friends" subtitle="Connect with other players, accept requests, manage your network.">
      {feedback && (
        <div className={cn(
          'mb-4 p-3 rounded-lg border text-sm',
          feedback.kind === 'ok'
            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
            : 'bg-red-500/15 text-red-500 border-red-500/30',
        )}>
          {feedback.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: search & requests */}
        <section className="lg:col-span-1 space-y-6">
          {/* Search */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <h2 className="text-base font-bold text-white mb-3">Find Players</h2>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by username..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="mt-3 space-y-1">
              {query.trim() && searchResults.length === 0 && (
                <p className="text-xs text-slate-500 px-1">No players matched.</p>
              )}
              {searchResults.map(u => {
                const rel = getFriendStatus(me, u.uid);
                return (
                  <div key={u.uid} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-700/40">
                    <Link to={`/profile/${u.uid}`} className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {u.profile?.username[0].toUpperCase()}
                      </span>
                      <span className="text-sm text-white truncate">{u.profile?.username}</span>
                    </Link>
                    {rel ? (
                      <span className="text-[11px] text-slate-500 capitalize">{rel.status}</span>
                    ) : (
                      <button
                        onClick={() => handleSend(u.uid)}
                        className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Requests */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              Pending Requests
              {incoming.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 font-bold">
                  {incoming.length}
                </span>
              )}
            </h2>
            {incoming.length === 0 ? (
              <p className="text-xs text-slate-500">No incoming requests.</p>
            ) : (
              <ul className="space-y-2">
                {incoming.map(req => {
                  const fromUser = allUsers.find(u => u.uid === req.from_pid);
                  const name = fromUser?.profile?.username ?? req.from_pid.slice(0, 6);
                  return (
                    <li key={req.from_pid} className="flex items-center justify-between gap-2">
                      <Link to={`/profile/${req.from_pid}`} className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 bg-gradient-to-br from-rose-500 to-rose-400 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {name[0].toUpperCase()}
                        </span>
                        <span className="text-sm text-white truncate">{name}</span>
                      </Link>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => acceptFriendRequest(me, req.from_pid)}
                          className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => removeFriend(me, req.from_pid)}
                          className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-md font-semibold"
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right: friends list */}
        <section className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Your Friends</h2>
              <span className="text-sm text-slate-400 font-mono">{accepted.length}</span>
            </div>

            {accepted.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500 text-sm">
                You haven't added any friends yet. Search for players on the left.
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/60">
                {accepted.map(f => {
                  const friendUser = allUsers.find(u => u.uid === f.friend_pid);
                  const name = friendUser?.profile?.username ?? f.friend_pid.slice(0, 8);
                  const elo = friendUser?.profile?.elo_rating ?? null;
                  return (
                    <motion.li
                      key={f.friend_pid}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-700/30 transition-colors"
                    >
                      <Link to={`/profile/${f.friend_pid}`} className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {name[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{name}</p>
                          <p className="text-xs text-slate-500">
                            Friends since {formatDate(f.since)}
                            {elo !== null && <> · Elo <span className="text-indigo-600 font-mono">{elo}</span></>}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeFriend(me, f.friend_pid)}
                        className="text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-md font-medium"
                      >
                        Remove
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
