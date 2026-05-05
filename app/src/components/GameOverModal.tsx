import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface GameOverModalProps {
  winner: string | null;
  playerRole: 'X' | 'O' | 'Spectator' | null;
  onBackToLobby: () => void;
  onRematch?: () => void;
  onReview?: () => void;
}

/**
 * Beautiful animated game-over modal replacing the browser alert().
 */
export default function GameOverModal({
  winner,
  playerRole,
  onBackToLobby,
  onRematch,
  onReview,
}: GameOverModalProps) {
  const isWinner = winner === playerRole;
  const isDraw = winner === 'Draw';
  const isLoser = !isWinner && !isDraw;

  const resultText = isWinner ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat';
  const resultEmoji = isWinner ? '🏆' : isDraw ? '🤝' : '💔';
  const resultColor = isWinner
    ? 'from-emerald-500 to-emerald-400'
    : isDraw
    ? 'from-slate-400 to-slate-300'
    : 'from-red-500 to-red-400';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-slate-800 rounded-3xl p-8 w-full max-w-md border border-slate-700 shadow-2xl text-center"
        >
          {/* Emoji */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-7xl mb-4"
          >
            {resultEmoji}
          </motion.div>

          {/* Result Text */}
          <h2
            className={cn(
              "text-4xl font-black mb-2 bg-gradient-to-r bg-clip-text text-transparent",
              resultColor
            )}
          >
            {resultText}
          </h2>

          <p className="text-slate-400 mb-8">
            {isWinner
              ? 'Congratulations! You outplayed your opponent.'
              : isDraw
              ? 'A hard-fought battle ends even.'
              : 'Better luck next time. Keep practicing!'}
          </p>

          {/* Winner badge */}
          <div className="mb-8 flex justify-center">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold",
              winner === 'X'
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : winner === 'O'
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-slate-700/50 text-slate-400 border border-slate-600"
            )}>
              {isDraw ? 'Game Drawn' : `${winner} Wins`}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {onReview && (
              <button
                onClick={onReview}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
              >
                <span>🎓</span> Review Game
              </button>
            )}
            <div className="flex gap-3">
              {onRematch && (
                <button
                  onClick={onRematch}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                >
                  Rematch
                </button>
              )}
              <button
                onClick={onBackToLobby}
                className={cn(
                  "py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                  onRematch ? "flex-1" : "w-full"
                )}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
