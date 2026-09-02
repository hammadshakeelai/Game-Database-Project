import { motion } from 'motion/react';
import type { GameState, Move, Player } from '../../types';
import { cn } from '../../utils';
import type { Role } from './types';

/**
 * The Ultimate Tic-Tac-Toe board: a 3x3 grid of 3x3 sub-boards.
 *
 * Pure rendering — every decision about legality comes from the game state the
 * server sent. Turn and target-board cues are carried by text and shape as well
 * as colour, so the board is usable without colour vision.
 */

const POSITION_NAMES = [
  'top left', 'top centre', 'top right',
  'middle left', 'centre', 'middle right',
  'bottom left', 'bottom centre', 'bottom right',
];

interface BoardProps {
  state: GameState;
  role: Role;
  interactive: boolean;
  hint: Move | null;
  onCellClick: (superIdx: number, subIdx: number) => void;
}

export function Board({ state, role, interactive, hint, onCellClick }: BoardProps) {
  const myTurn = interactive && role !== 'spectator' && state.currentPlayer === role;

  return (
    <div
      className="ttt-superboard grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 p-2.5 sm:p-4 rounded-2xl"
      role="group"
      aria-label="Ultimate Tic-Tac-Toe board"
    >
      {state.superBoard.map((cells, superIdx) => {
        const subWinner = state.subBoardWinners[superIdx] ?? null;
        const isTarget =
          state.nextRequiredSubBoard === superIdx ||
          (state.nextRequiredSubBoard === null && subWinner === null);
        const playable = myTurn && isTarget && subWinner === null && state.winner === null;

        return (
          <SubBoard
            key={superIdx}
            cells={cells}
            superIdx={superIdx}
            playable={playable}
            highlighted={myTurn && isTarget && subWinner === null}
            subWinner={subWinner}
            hint={hint}
            onCellClick={onCellClick}
          />
        );
      })}
    </div>
  );
}

interface SubBoardProps {
  cells: Player[];
  superIdx: number;
  playable: boolean;
  highlighted: boolean;
  subWinner: Player | 'Draw';
  hint: Move | null;
  onCellClick: (superIdx: number, subIdx: number) => void;
}

function SubBoard({
  cells,
  superIdx,
  playable,
  highlighted,
  subWinner,
  hint,
  onCellClick,
}: SubBoardProps) {
  const decided = subWinner !== null;

  return (
    <div
      className={cn(
        'ttt-subboard relative grid grid-cols-3 gap-1 p-1 sm:p-2 rounded-xl',
        highlighted && 'active',
        decided && 'dim',
      )}
      role="group"
      aria-label={
        decided
          ? `${POSITION_NAMES[superIdx]} board, won by ${subWinner === 'Draw' ? 'nobody' : subWinner}`
          : `${POSITION_NAMES[superIdx]} board${highlighted ? ', you must play here' : ''}`
      }
    >
      {decided && (
        <div
          className="ttt-subboard-overlay absolute inset-0 z-10 flex items-center justify-center rounded-xl"
          aria-hidden="true"
        >
          {subWinner === 'Draw' ? (
            <span className="text-2xl font-black text-slate-500 sm:text-3xl">—</span>
          ) : (
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={cn(
                'text-4xl font-black sm:text-6xl',
                subWinner === 'X' ? 'ttt-overlay-x' : 'ttt-overlay-o',
              )}
            >
              {subWinner}
            </motion.span>
          )}
        </div>
      )}

      {cells.map((cell, subIdx) => {
        const isHint = hint?.superGridIndex === superIdx && hint?.subGridIndex === subIdx;
        const disabled = !playable || cell !== null;

        return (
          <button
            key={subIdx}
            type="button"
            data-testid={`cell-${superIdx}-${subIdx}`}
            onClick={() => onCellClick(superIdx, subIdx)}
            disabled={disabled}
            className={cn(
              'ttt-cell flex items-center justify-center rounded-lg',
              // Sized so nine sub-boards fit a 360px phone without page scroll,
              // while keeping the tap target usable.
              'h-[9.5vw] w-[9.5vw] text-[4vw] sm:h-14 sm:w-14 sm:text-2xl md:h-16 md:w-16 md:text-3xl',
              'font-bold transition-transform',
              !disabled && 'playable cursor-pointer hover:scale-105 active:scale-95',
              cell === 'X' && 'x-piece',
              cell === 'O' && 'o-piece',
              isHint && 'hint animate-pulse',
            )}
            aria-label={
              cell
                ? `${POSITION_NAMES[subIdx]} — ${cell}`
                : disabled
                  ? `${POSITION_NAMES[subIdx]} — empty, not playable`
                  : `Play ${POSITION_NAMES[subIdx]}`
            }
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

/**
 * Whose turn it is, stated in words. The board itself uses colour, so this
 * carries the same information for anyone who cannot rely on that.
 */
export function TurnIndicator({
  state,
  role,
  status,
}: {
  state: GameState;
  role: Role;
  status: 'waiting' | 'active' | 'finished';
}) {
  if (status === 'waiting') {
    return <p className="text-sm text-slate-400">Waiting for an opponent to join…</p>;
  }
  if (status === 'finished') return null;

  const yours = state.currentPlayer === role;
  const target = state.nextRequiredSubBoard;

  return (
    <p aria-live="polite" className="text-sm font-medium">
      <span className={yours ? 'text-emerald-300' : 'text-slate-400'}>
        {yours ? 'Your turn' : `${state.currentPlayer}'s turn`}
      </span>
      {yours && (
        <span className="text-slate-500">
          {' · '}
          {target === null ? 'play anywhere' : `play in the ${POSITION_NAMES[target]} board`}
        </span>
      )}
    </p>
  );
}
