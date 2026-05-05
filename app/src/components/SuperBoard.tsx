import type { GameState, Move } from '../types';
import SubBoard from './SubBoard';

interface SuperBoardProps {
  gameState: GameState;
  playerRole: 'X' | 'O' | 'Spectator' | null;
  hintMove: Move | null;
  onCellClick: (superIdx: number, subIdx: number) => void;
  lastMove?: Move | null;
  bestMove?: Move | null;
}

/**
 * The 3x3 grid of sub-boards that makes up the super tic-tac-toe game.
 * Pure rendering component — all state management is handled by the parent.
 */
export default function SuperBoard({ gameState, playerRole, hintMove, onCellClick, lastMove, bestMove }: SuperBoardProps) {
  return (
    <div
      id="super-board"
      className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 p-3 sm:p-4 bg-slate-800/80 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm"
    >
      {gameState.superBoard.map((subBoard, superIdx) => {
        const isRequired = gameState.nextRequiredSubBoard === superIdx;
        const isFree = gameState.nextRequiredSubBoard === null && gameState.subBoardWinners[superIdx] === null;
        const isPlayable =
          (isRequired || isFree) &&
          gameState.winner === null &&
          gameState.currentPlayer === playerRole;
        const subWinner = gameState.subBoardWinners[superIdx];

        return (
          <SubBoard
            // @ts-expect-error React key prop
            key={superIdx}
            cells={subBoard}
            superIdx={superIdx}
            isPlayable={isPlayable}
            subWinner={subWinner}
            hintMove={hintMove}
            onCellClick={onCellClick}
            lastMove={lastMove}
            bestMove={bestMove}
          />
        );
      })}
    </div>
  );
}
