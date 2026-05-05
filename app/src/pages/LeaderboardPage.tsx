import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { UserProfile } from '../AuthContext';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<(UserProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('elo_rating', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        setLeaders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/lobby')} className="text-slate-400 hover:text-white transition-colors">
            &larr; Back to Lobby
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Global Leaderboard
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading top players...</div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th className="p-4 font-semibold text-slate-400 w-16 text-center">Rank</th>
                  <th className="p-4 font-semibold text-slate-400">Player</th>
                  <th className="p-4 font-semibold text-slate-400 text-right">Elo Rating</th>
                  <th className="p-4 font-semibold text-slate-400 text-right hidden sm:table-cell">Matches</th>
                  <th className="p-4 font-semibold text-slate-400 text-right hidden md:table-cell">Win Rate</th>
                  <th className="p-4 font-semibold text-slate-400 text-right hidden lg:table-cell">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((player, index) => {
                  const winRate = player.matches_played > 0 
                    ? Math.round((player.wins / player.matches_played) * 100) 
                    : 0;
                  
                  return (
                    <tr key={player.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-center font-mono text-slate-500">
                        {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td className="p-4">
                        <Link to={`/profile/${player.id}`} className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                          {player.username}
                        </Link>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400">
                        {player.elo_rating}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-400 hidden sm:table-cell">
                        {player.matches_played || 0}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-400 hidden md:table-cell">
                        {winRate}%
                      </td>
                      <td className="p-4 text-right font-mono text-blue-400 hidden lg:table-cell">
                        {player.avg_accuracy || 0}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
