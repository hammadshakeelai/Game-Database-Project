import { motion } from 'motion/react';
import type { Player, Move } from '../types';
import { cn } from '../utils';

interface SubBoardProps {
  cells: Player[];
  superIdx: number;
  isPlayable: boolean;
  subWinner: Player | 'Draw' | null;
  hintMove: Move | null;
  onCellClick: (superIdx: number, subIdx: number) => void;
  lastMove?: Move | null;
  bestMove?: Move | null;
}

/**
 * A single 3x3 sub-board within the super tic-tac-toe grid.
 * Handles its own winner overlay and hint highlighting.
 */
export default function SubBoard({
  cells,
  superIdx,
  isPlayable,
  subWinner,
  hintMove,
  onCellClick,
  lastMove,
  bestMove,
}: SubBoardProps) {
  return (
    <div
      className={cn(
        "relative grid grid-cols-3 gap-1 p-1.5 sm:p-2 rounded-xl transition-all duration-300",
        isPlayable
          ? "bg-indigo-500/20 ring-2 ring-indigo-500/70 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          : "bg-slate-900/50",
        subWinner ? "opacity-60" : ""
      )}
    >
      {/* Sub-board winner overlay */}
      {subWinner && subWinner !== 'Draw' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80 rounded-xl backdrop-blur-sm">
          <motion.span
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={cn(
              "text-4xl sm:text-6xl font-black",
              subWinner === 'X' ? "text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]"
            )}
          >
            {subWinner}
          </motion.span>
        </div>
      )}

      {/* Draw overlay */}
      {subWinner === 'Draw' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/70 rounded-xl backdrop-blur-sm">
          <span className="text-2xl sm:text-3xl font-black text-slate-500">—</span>
        </div>
      )}

      {/* Cells */}
      {cells.map((cell, subIdx) => {
        const isHint =
          hintMove?.superGridIndex === superIdx &&
          hintMove?.subGridIndex === subIdx;
        const isLastMove =
          lastMove?.superGridIndex === superIdx &&
          lastMove?.subGridIndex === subIdx;
        const isBestMove =
          bestMove?.superGridIndex === superIdx &&
          bestMove?.subGridIndex === subIdx;

        return (
          <button
            key={subIdx}
            id={`cell-${superIdx}-${subIdx}`}
            onClick={() => onCellClick(superIdx, subIdx)}
            disabled={!isPlayable || cell !== null || subWinner !== null}
            className={cn(
              "w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center",
              "text-xl sm:text-2xl md:text-3xl font-bold rounded-lg transition-all duration-200",
              cell === null && isPlayable
                ? "hover:bg-indigo-500/30 cursor-pointer bg-slate-800 hover:scale-105"
                : "bg-slate-800 cursor-default",
              cell === 'X' ? "text-indigo-400" : cell === 'O' ? "text-rose-400" : "",
              isHint
                ? "ring-2 ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.6)] bg-sky-500/20 animate-pulse"
                : isLastMove
                ? "ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)] bg-amber-500/10"
                : isBestMove
                ? "ring-2 ring-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] bg-emerald-500/10"
                : ""
            )}
            aria-label={`Cell ${superIdx}-${subIdx}: ${cell || 'empty'}`}
          >
            {cell && (
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {cell}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
