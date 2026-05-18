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
        'ttt-subboard relative grid grid-cols-3 gap-1 p-1.5 sm:p-2 rounded-xl',
        isPlayable && 'active',
        subWinner && 'dim',
      )}
    >
      {/* Sub-board winner overlay */}
      {subWinner && subWinner !== 'Draw' && (
        <div className="ttt-subboard-overlay absolute inset-0 flex items-center justify-center z-10 rounded-xl">
          <motion.span
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              'text-4xl sm:text-6xl font-black',
              subWinner === 'X' ? 'ttt-overlay-x' : 'ttt-overlay-o',
            )}
          >
            {subWinner}
          </motion.span>
        </div>
      )}

      {/* Draw overlay */}
      {subWinner === 'Draw' && (
        <div className="ttt-subboard-overlay absolute inset-0 flex items-center justify-center z-10 rounded-xl">
          <span className="text-2xl sm:text-3xl font-black" style={{ color: '#6b6452' }}>—</span>
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

        const cellEmpty = cell === null;
        const cellPlayable = cellEmpty && isPlayable && subWinner === null;

        return (
          <button
            key={subIdx}
            id={`cell-${superIdx}-${subIdx}`}
            onClick={() => onCellClick(superIdx, subIdx)}
            disabled={!isPlayable || cell !== null || subWinner !== null}
            className={cn(
              'ttt-cell w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center',
              'text-xl sm:text-2xl md:text-3xl font-bold rounded-lg',
              cellPlayable && 'playable cursor-pointer',
              cell === 'X' && 'x-piece',
              cell === 'O' && 'o-piece',
              isHint && 'hint animate-pulse',
              !isHint && isLastMove && 'last',
              !isHint && !isLastMove && isBestMove && 'best',
            )}
            aria-label={`Cell ${superIdx}-${subIdx}: ${cell || 'empty'}`}
          >
            {cell && (
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
