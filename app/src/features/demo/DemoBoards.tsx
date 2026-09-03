import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { applyMove, checkWinner, createInitialState, isValidMove } from '../../gameLogic';
import type { GameState, Player } from '../../types';
import { cn } from '../../utils';

/**
 * Two playable demos for the sign-in page.
 *
 * Most visitors have played classic tic-tac-toe and have never heard of the
 * Ultimate variant. Describing the forced-board rule in a sentence does not
 * land; letting someone play two moves does. So the page shows the familiar
 * game beside the real one, and the difference explains itself.
 *
 * The Ultimate demo runs the *actual* engine from `gameLogic.ts` rather than a
 * simplified copy, so what a newcomer learns here is true of the real game.
 */

const CELL =
  'flex items-center justify-center rounded-[3px] border font-semibold transition-transform duration-150';

/** A mark is pressed onto the sheet: it settles, it does not pop from nothing. */
const stamp = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 26 },
};

function useResetTimer(reset: () => void, when: boolean, delay = 1600) {
  useEffect(() => {
    if (!when) return;
    const t = setTimeout(reset, delay);
    return () => clearTimeout(t);
  }, [when, reset, delay]);
}

// ---------------------------------------------------------------------------
// Classic 3x3 — the game everybody already knows
// ---------------------------------------------------------------------------

export function ClassicDemo() {
  const [cells, setCells] = useState<Player[]>(() => Array(9).fill(null));
  const [winner, setWinner] = useState<Player | 'Draw'>(null);
  const busy = useRef(false);

  const reset = useCallback(() => {
    setCells(Array(9).fill(null));
    setWinner(null);
    busy.current = false;
  }, []);

  useResetTimer(reset, winner !== null);

  function play(index: number) {
    if (cells[index] || winner || busy.current) return;

    const afterYou = [...cells];
    afterYou[index] = 'X';
    const yourResult = checkWinner(afterYou);
    setCells(afterYou);
    if (yourResult) {
      setWinner(yourResult);
      return;
    }

    // The opponent answers after a beat, so the exchange reads as a turn.
    busy.current = true;
    setTimeout(() => {
      const open = afterYou.map((c, i) => (c === null ? i : null)).filter(i => i !== null);
      if (open.length === 0) {
        busy.current = false;
        return;
      }
      const pick = open[Math.floor(Math.random() * open.length)]!;
      const afterThem = [...afterYou];
      afterThem[pick] = 'O';
      setCells(afterThem);
      setWinner(checkWinner(afterThem));
      busy.current = false;
    }, 380);
  }

  return (
    <DemoFrame
      label="The game you know"
      caption="Three in a row. One board."
      status={
        winner === null
          ? 'Your move'
          : winner === 'Draw'
            ? 'Drawn'
            : winner === 'X'
              ? 'You win'
              : 'You lose'
      }
    >
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Classic tic-tac-toe demo">
        {cells.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => play(i)}
            disabled={cell !== null || winner !== null}
            aria-label={cell ? `Square ${i + 1}, ${cell}` : `Play square ${i + 1}`}
            className={cn(
              CELL,
              'h-12 w-12 text-xl sm:h-14 sm:w-14 sm:text-2xl',
              'border-slate-600/60 bg-slate-900/50',
              !cell && !winner && 'hover:scale-105 hover:border-indigo-400/70 active:scale-95',
              cell === 'X' && 'text-slate-100',
              cell === 'O' && 'text-rose-300',
            )}
          >
            {cell && <motion.span {...stamp}>{cell}</motion.span>}
          </button>
        ))}
      </div>
    </DemoFrame>
  );
}

// ---------------------------------------------------------------------------
// Ultimate — the game this site actually plays
// ---------------------------------------------------------------------------

/** Every legal move in the position, using the real rules. */
function legalMoves(state: GameState): { sup: number; sub: number }[] {
  const out: { sup: number; sub: number }[] = [];
  for (let sup = 0; sup < 9; sup++) {
    for (let sub = 0; sub < 9; sub++) {
      if (isValidMove(state, sup, sub)) out.push({ sup, sub });
    }
  }
  return out;
}

export function UltimateDemo() {
  const [state, setState] = useState<GameState>(createInitialState);
  const busy = useRef(false);

  const reset = useCallback(() => {
    setState(createInitialState());
    busy.current = false;
  }, []);

  useResetTimer(reset, state.winner !== null, 2200);

  function play(sup: number, sub: number) {
    if (busy.current || state.winner || !isValidMove(state, sup, sub)) return;

    const afterYou = applyMove(state, { superGridIndex: sup, subGridIndex: sub, player: 'X' });
    setState(afterYou);
    if (afterYou.winner) return;

    busy.current = true;
    setTimeout(() => {
      const options = legalMoves(afterYou);
      if (options.length === 0) {
        busy.current = false;
        return;
      }
      const pick = options[Math.floor(Math.random() * options.length)]!;
      setState(
        applyMove(afterYou, {
          superGridIndex: pick.sup,
          subGridIndex: pick.sub,
          player: 'O',
        }),
      );
      busy.current = false;
    }, 420);
  }

  const target = state.nextRequiredSubBoard;
  const status =
    state.winner === 'Draw'
      ? 'Drawn'
      : state.winner === 'X'
        ? 'You win'
        : state.winner === 'O'
          ? 'You lose'
          : target === null
            ? 'Play anywhere'
            : 'Play in the lit board';

  return (
    <DemoFrame
      label="The game played here"
      caption="Your square sends them to that board."
      status={status}
    >
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Ultimate tic-tac-toe demo">
        {state.superBoard.map((sub, sup) => {
          const decided = state.subBoardWinners[sup] ?? null;
          const lit =
            state.winner === null &&
            decided === null &&
            (target === sup || (target === null && decided === null));

          return (
            <div
              key={sup}
              className={cn(
                'relative grid grid-cols-3 gap-px rounded-[4px] border p-1',
                lit
                  ? 'border-indigo-400/80 bg-slate-900/60'
                  : 'border-slate-600/40 bg-slate-900/35',
                decided && 'opacity-70',
              )}
            >
              {decided && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-1 flex items-center justify-center rounded-[4px] bg-slate-900/80"
                >
                  <motion.span
                    {...stamp}
                    className={cn(
                      'text-lg font-semibold',
                      decided === 'X' ? 'text-slate-100' : 'text-rose-300',
                    )}
                  >
                    {decided === 'Draw' ? '·' : decided}
                  </motion.span>
                </div>
              )}
              {sub.map((cell, idx) => {
                const playable = lit && cell === null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => play(sup, idx)}
                    disabled={!playable}
                    aria-label={
                      cell
                        ? `Board ${sup + 1} square ${idx + 1}, ${cell}`
                        : `Play board ${sup + 1} square ${idx + 1}`
                    }
                    className={cn(
                      CELL,
                      'h-4 w-4 border-transparent text-[9px] sm:h-5 sm:w-5 sm:text-[11px]',
                      playable && 'hover:scale-110 active:scale-95',
                      cell === 'X' && 'text-slate-100',
                      cell === 'O' && 'text-rose-300',
                    )}
                  >
                    {cell && <motion.span {...stamp}>{cell}</motion.span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </DemoFrame>
  );
}

// ---------------------------------------------------------------------------

function DemoFrame({
  label,
  caption,
  status,
  children,
}: {
  label: string;
  caption: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-700/70 bg-slate-800/50 p-4">
      <p className="ttt-display text-sm font-semibold text-slate-200">{label}</p>
      <p className="mb-3 text-center text-xs text-slate-400">{caption}</p>
      {children}
      <p aria-live="polite" className="ttt-notation mt-3 text-[11px] tracking-wide text-indigo-300">
        {status}
      </p>
    </div>
  );
}
