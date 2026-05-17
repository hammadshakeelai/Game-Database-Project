import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, localSignOut } from '../AuthContext';

import { motion } from 'motion/react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import ChatBox from '../components/ChatBox';
import NotificationBell from '../components/NotificationBell';
import { cn, generateMatchId, formatDate, getMatchHistory, BOT_DIFFICULTY_LABELS, BOT_DIFFICULTY_COLORS } from '../utils';
import type { MatchRecord } from '../types';
import { listGameTypes } from '../stores';

export default function LobbyPage() {
  const { user, profile, isLocalMode } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string; timestamp: number }[]>([]);

  // Load local match history
  useEffect(() => {
    if (user?.uid) {
      setMatches(getMatchHistory(user.uid).slice(0, 10));
    }
  }, [user?.uid]);

  // Refresh history when returning from a game
  useEffect(() => {
    const refresh = () => {
      if (user?.uid) setMatches(getMatchHistory(user.uid).slice(0, 10));
    };
    window.addEventListener('profile-updated', refresh);
    return () => window.removeEventListener('profile-updated', refresh);
  }, [user?.uid]);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState(3);
  const [gameMode, setGameMode] = useState<'bot' | 'friend'>('bot');
  const [joinCode, setJoinCode] = useState('');
  const gameTypes = useMemo(() => listGameTypes(), []);
  const [gameTypeId, setGameTypeId] = useState<string>(gameTypes[0]?.gt_id ?? '');

  // Socket-based global chat
  useEffect(() => {
    if (!socket) return;
    const onGlobalChat = (data: { sender: string; message: string; timestamp: number }) => {
      setChatMessages(prev => [...prev, data]);
    };
    socket.on('global_chat_receive', onGlobalChat);
    return () => { socket.off('global_chat_receive', onGlobalChat); };
  }, [socket]);

  const sendGlobalChat = (message: string) => {
    if (!user || !profile || !socket) return;
    socket.emit('global_chat_send', {
      sender: profile.username,
      message,
      timestamp: Date.now(),
    });
  };

  const persistGameTypeSelection = (matchId: string) => {
    if (gameTypeId) {
      try {
        localStorage.setItem(`match_gametype_${matchId}`, gameTypeId);
      } catch {/* ignore quota errors */}
    }
  };

  const createPrivateMatch = () => {
    const matchId = generateMatchId();
    if (socket && user) {
      persistGameTypeSelection(matchId);
      socket.emit('create_match', { matchId, userId: user.uid });
      setTimeout(() => navigate(`/play/${matchId}`), 100);
    }
  };

  const createBotMatch = () => {
    const matchId = generateMatchId('bot');
    if (socket && user) {
      persistGameTypeSelection(matchId);
      socket.emit('create_match', { matchId, userId: user.uid, isBotMatch: true, botDifficulty });
      setTimeout(() => navigate(`/play/${matchId}`), 100);
    }
  };

  const joinMatchByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/play/${joinCode.trim().toUpperCase()}`);
    }
  };

  const difficultyLabels = ['', 'Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col lg:flex-row">
      {/* Sidebar - Global Chat */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col bg-slate-900/50 h-64 lg:h-auto">
        <div className="p-4 border-b border-slate-800 bg-slate-800/50 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Global Chat
          </h2>
        </div>
        <div className="flex-1 min-h-0">
          <ChatBox
            messages={chatMessages}
            onSend={sendGlobalChat}
            currentUserName={profile?.username || ''}
            title="Global Chat"
            placeholder="Type a message..."
            emptyMessage="Welcome to Global Chat!"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto relative">
        <div className="sticky top-0 -mx-4 -mt-4 sm:-mx-8 sm:-mt-8 mb-6 px-4 sm:px-8 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-700 z-20 flex items-center gap-3 flex-wrap">
          <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {[
              { to: '/lobby', label: 'Lobby' },
              { to: '/tournaments', label: 'Tournaments' },
              { to: '/groups', label: 'Groups' },
              { to: '/friends', label: 'Friends' },
              { to: '/leaderboard', label: 'Leaderboard' },
            ].map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/lobby'}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-800',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <Link
              to={`/profile/${user?.uid}`}
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm font-semibold text-white"
            >
              Profile
            </Link>
            <button
              onClick={() => { localSignOut(); window.location.href = '/'; }}
              className="text-slate-400 hover:text-red-500 transition-colors text-sm font-medium px-2"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between shadow-xl gap-6"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg shadow-indigo-500/30">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{profile?.username}</h1>
                <div className="flex gap-3 text-sm text-slate-400 flex-wrap">
                  <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    Elo: <span className="text-indigo-400 font-mono font-bold">{profile?.elo_rating}</span>
                  </div>
                  <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    Matches: <span className="text-emerald-400 font-mono font-bold">{profile?.matches_played || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => { setGameMode('friend'); setShowCustomModal(true); }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20 w-full"
              >
                Play Online
              </button>
              <button
                onClick={() => { setGameMode('bot'); setShowCustomModal(true); }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20 w-full"
              >
                Play Computer
              </button>
            </div>
          </motion.div>

          {/* Join by Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Join with Code</h2>
              <p className="text-sm text-slate-400">Have a match code from a friend? Enter it here.</p>
            </div>
            <form onSubmit={joinMatchByCode} className="flex w-full md:w-auto gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3"
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 font-mono uppercase w-full md:w-48 transition-colors"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-colors"
              >
                Join
              </button>
            </form>
          </motion.div>

          {/* Pro Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-white mb-4">Pro Tips</h2>
            <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
              <li><strong>Control the Center:</strong> Winning the center sub-board gives you a massive strategic advantage.</li>
              <li><strong>Force Moves:</strong> Send your opponent to sub-boards that are already won or full for free choice.</li>
              <li><strong>Sacrifice for Position:</strong> Sometimes losing a sub-board is worth it for better global board position.</li>
              <li><strong>Use Hints:</strong> If stuck, the Hint button shows the AI's suggested move.</li>
            </ul>
          </motion.div>

          {/* Match History */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Matches</h2>
              <Link
                to={`/profile/${user?.uid}`}
                className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
              >
                View Full History
              </Link>
            </div>
            <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium">Opponent</th>
                    <th className="p-4 font-medium">Result</th>
                    <th className="p-4 font-medium hidden sm:table-cell">Moves</th>
                    <th className="p-4 font-medium hidden md:table-cell">Status</th>
                    <th className="p-4 font-medium hidden sm:table-cell">Date</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">No matches played yet.</td>
                    </tr>
                  ) : (
                    matches.map((match) => {
                      const isPlayerX = match.player_x === user?.uid;
                      const myRole = isPlayerX ? 'X' : 'O';
                      const isWinner = match.winner === myRole;
                      const isDraw = match.winner === 'Draw';
                      const resultColor = isWinner ? 'bg-emerald-500/20 text-emerald-400' : isDraw ? 'bg-slate-500/20 text-slate-400' : 'bg-red-500/20 text-red-400';
                      const resultText = isWinner ? 'Win' : isDraw ? 'Draw' : 'Loss';
                      const diffLabel = match.botDifficulty ? BOT_DIFFICULTY_LABELS[match.botDifficulty] : '';
                      const diffColor = match.botDifficulty ? BOT_DIFFICULTY_COLORS[match.botDifficulty] : '';

                      return (
                        <tr key={match.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {match.isBotMatch ? (
                                <>
                                  <span className="text-white font-medium">Computer</span>
                                  {diffLabel && (
                                    <span className={cn('text-xs px-1.5 py-0.5 rounded border font-semibold', diffColor)}>
                                      {diffLabel}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-white font-medium">
                                  {isPlayerX ? match.player_o_name : match.player_x_name || 'Player'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${resultColor}`}>{resultText}</span>
                          </td>
                          <td className="p-4 text-slate-300 font-mono hidden sm:table-cell">{match.moves_count}</td>
                          <td className="p-4 text-slate-300 capitalize hidden md:table-cell">{match.status}</td>
                          <td className="p-4 text-slate-400 font-mono text-sm hidden sm:table-cell">{formatDate(match.created_at)}</td>
                          <td className="p-4">
                            <Link
                              to={`/review/${match.id}`}
                              className="px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Game Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Custom Game</h3>

            <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 rounded-lg">
              <button
                onClick={() => setGameMode('bot')}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                  gameMode === 'bot' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Play Bot
              </button>
              <button
                onClick={() => setGameMode('friend')}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                  gameMode === 'friend' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Play Friend
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-400 mb-2">Game Type</label>
              <select
                value={gameTypeId}
                onChange={e => setGameTypeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {gameTypes.map(g => (
                  <option key={g.gt_id} value={g.gt_id}>
                    {g.type_name} {g.is_ranked ? '· Ranked' : '· Casual'}
                  </option>
                ))}
              </select>
              {gameTypeId && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {gameTypes.find(g => g.gt_id === gameTypeId)?.description}
                </p>
              )}
            </div>

            {gameMode === 'bot' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Difficulty: <span className="text-indigo-600 font-bold">{difficultyLabels[botDifficulty]}</span>
                  </label>
                  <input
                    type="range"
                    min="1" max="5"
                    value={botDifficulty}
                    onChange={(e) => setBotDifficulty(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                  </div>
                </div>
              </div>
            )}

            {gameMode === 'friend' && (
              <div className="mb-6 text-sm text-slate-400 text-center">
                Create a private match and share the link with a friend!
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={gameMode === 'bot' ? createBotMatch : createPrivateMatch}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
              >
                Start Game
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
