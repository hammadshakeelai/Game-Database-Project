import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn, formatEloChange } from '../utils';

export default function SummaryPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    eloChange?: number;
    newElo?: number;
    isWinner?: boolean;
    isDraw?: boolean;
    accuracy?: number;
  } | null;

  const eloChange = state?.eloChange ?? 0;
  const newElo = state?.newElo ?? 1200;
  const isWinner = state?.isWinner ?? false;
  const isDraw = state?.isDraw ?? false;
  const accuracy = state?.accuracy;

  const resultText = isWinner ? 'Victory!' : isDraw ? 'Draw' : 'Defeat';
  const resultEmoji = isWinner ? '🏆' : isDraw ? '🤝' : '💔';
  const resultColor = isWinner ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[150px] opacity-20",
          isWinner ? "bg-emerald-500" : isDraw ? "bg-slate-500" : "bg-red-500"
        )} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="max-w-2xl w-full bg-slate-800/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-slate-700 z-10"
      >
        {/* Result */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-center mb-2"
        >
          <span className="text-6xl">{resultEmoji}</span>
        </motion.div>

        <h1 className={cn("text-4xl sm:text-5xl font-black text-center mb-2", resultColor)}>
          {resultText}
        </h1>
        <p className="text-slate-500 text-center mb-8 font-mono text-sm">Match {matchId}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/80 p-6 rounded-2xl text-center border border-slate-700/50"
          >
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Elo Change</h3>
            <div className={cn(
              "text-4xl sm:text-5xl font-black",
              eloChange > 0 ? 'text-emerald-400' : eloChange < 0 ? 'text-red-400' : 'text-slate-400'
            )}>
              {formatEloChange(eloChange)}
            </div>
            <div className="text-sm text-slate-500 mt-2 font-mono">New Rating: {newElo}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/80 p-6 rounded-2xl text-center border border-slate-700/50"
          >
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Accuracy</h3>
            <div className="text-4xl sm:text-5xl font-black text-indigo-400">
              {accuracy !== undefined ? `${accuracy}%` : '--'}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              {accuracy !== undefined ? 'AI Evaluated' : 'Not Available'}
            </div>
          </motion.div>
        </div>

        {/* Accuracy bar */}
        {accuracy !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Accuracy</span>
              <span>{accuracy}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${accuracy}%` }}
                transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  accuracy >= 80 ? "bg-emerald-500" :
                  accuracy >= 60 ? "bg-blue-500" :
                  accuracy >= 40 ? "bg-amber-500" :
                  "bg-red-500"
                )}
              />
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={() => navigate(`/review/${matchId}`)}
            className="w-full py-4 bg-violet-600 hover:bg-violet-700 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
          >
            <span>🎓</span> Review Game
          </button>
          <button
            onClick={() => navigate('/lobby')}
            className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Back to Lobby
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
