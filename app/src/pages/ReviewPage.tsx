import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import type { CompletedGameRecord, Move, MoveAccuracyLog } from '../types';
import { createInitialState, applyMove } from '../gameLogic';
import { getCoachText } from '../aiEvaluator';
import SuperBoard from '../components/SuperBoard';

// ── helpers ────────────────────────────────────────────────────────────────

function loadRecord(matchId: string): CompletedGameRecord | null {
  try {
    const raw = localStorage.getItem(`review_${matchId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Replay moves[0..count-1] from the initial state. */
function replayMoves(moves: Move[], count: number) {
  let state = createInitialState();
  for (let i = 0; i < count; i++) {
    state = applyMove(state, moves[i]);
  }
  return state;
}

const LABEL_STYLES: Record<string, string> = {
  'Best Move': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'Good Move': 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  'Inaccuracy': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'Blunder': 'text-red-400 bg-red-500/10 border-red-500/30',
  'Forced': 'text-slate-400 bg-slate-700/40 border-slate-600',
};

const LABEL_ICONS: Record<string, string> = {
  'Best Move': '★',
  'Good Move': '✓',
  'Inaccuracy': '?!',
  'Blunder': '??',
  'Forced': '—',
};

// ── component ──────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const record = useMemo(() => loadRecord(matchId ?? ''), [matchId]);

  // Main line position cursor (0 = before any moves, N = after N moves)
  const [moveIndex, setMoveIndex] = useState<number>(0);

  // Branch / self-review state
  const [isBranching, setIsBranching] = useState(false);
  const [branchMoves, setBranchMoves] = useState<Move[]>([]);
  const [branchIndex, setBranchIndex] = useState(0);

  // Which main-line move is selected in the move list (for coach panel)
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);

  // ── derived state ────────────────────────────────────────────────────────

  /** Game state at current review position */
  const displayState = useMemo(() => {
    if (!record) return createInitialState();
    if (isBranching) {
      const base = replayMoves(record.moves, moveIndex);
      let s = base;
      for (let i = 0; i < branchIndex; i++) {
        s = applyMove(s, branchMoves[i]);
      }
      return s;
    }
    return replayMoves(record.moves, moveIndex);
  }, [record, moveIndex, isBranching, branchMoves, branchIndex]);

  /** The last move played at current position (for amber highlight) */
  const lastMove = useMemo((): Move | null => {
    if (isBranching) {
      if (branchIndex > 0) return branchMoves[branchIndex - 1];
      if (moveIndex > 0) return record?.moves[moveIndex - 1] ?? null;
      return null;
    }
    return moveIndex > 0 ? (record?.moves[moveIndex - 1] ?? null) : null;
  }, [isBranching, branchMoves, branchIndex, moveIndex, record]);

  /** Accuracy log entry for the currently visible move */
  const activeLog: MoveAccuracyLog | null = useMemo(() => {
    if (!record) return null;
    const idx = selectedLogIndex !== null ? selectedLogIndex : moveIndex - 1;
    if (idx < 0 || idx >= record.accuracyLog.length) return null;
    return record.accuracyLog[idx];
  }, [record, moveIndex, selectedLogIndex]);

  const bestMoveForDisplay: Move | null = useMemo(() => {
    if (!activeLog) return null;
    // Re-derive bestMove from log — we stored it in AccuracyResult which isn't part of MoveAccuracyLog,
    // so we only have delta/label. bestMove highlight is available if the coach text references it.
    return null; // bestMove not stored in MoveAccuracyLog; shown via text only
  }, [activeLog]);

  const coachComment = useMemo(() => {
    if (!activeLog) return null;
    return getCoachText(activeLog, null);
  }, [activeLog]);

  const totalMoves = record?.moves.length ?? 0;

  // ── navigation handlers ──────────────────────────────────────────────────

  const goToStart = useCallback(() => {
    exitBranch();
    setMoveIndex(0);
    setSelectedLogIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    if (isBranching) {
      if (branchIndex > 0) {
        setBranchIndex(i => i - 1);
      } else {
        exitBranch();
      }
      return;
    }
    setMoveIndex(i => Math.max(0, i - 1));
    setSelectedLogIndex(null);
  }, [isBranching, branchIndex]);

  const goToNext = useCallback(() => {
    if (isBranching) {
      if (branchIndex < branchMoves.length) {
        setBranchIndex(i => i + 1);
      }
      return;
    }
    setMoveIndex(i => Math.min(totalMoves, i + 1));
    setSelectedLogIndex(null);
  }, [isBranching, branchIndex, branchMoves.length, totalMoves]);

  const goToEnd = useCallback(() => {
    exitBranch();
    setMoveIndex(totalMoves);
    setSelectedLogIndex(null);
  }, [totalMoves]);

  const goToMoveIndex = useCallback((idx: number) => {
    exitBranch();
    setMoveIndex(idx);
    setSelectedLogIndex(idx - 1 >= 0 ? idx - 1 : null);
  }, []);

  function exitBranch() {
    setIsBranching(false);
    setBranchMoves([]);
    setBranchIndex(0);
  }

  // ── keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToPrev, goToNext]);

  // ── branch / self-review ─────────────────────────────────────────────────

  const handleBranchMove = useCallback((superIdx: number, subIdx: number) => {
    const player = displayState.currentPlayer;
    const move: Move = { superGridIndex: superIdx, subGridIndex: subIdx, player };

    if (!isBranching) {
      // Start a new branch from the current main-line position
      setIsBranching(true);
      setBranchMoves([move]);
      setBranchIndex(1);
    } else {
      // Extend the branch (truncate any forward branch history)
      const newBranch = [...branchMoves.slice(0, branchIndex), move];
      setBranchMoves(newBranch);
      setBranchIndex(newBranch.length);
    }
  }, [displayState, isBranching, branchMoves, branchIndex]);

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-slate-400 text-lg">No review data found for this match.</p>
        <p className="text-slate-500 text-sm">Only completed games can be reviewed.</p>
        <button
          onClick={() => navigate('/lobby')}
          className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const moveProgress = totalMoves > 0 ? (moveIndex / totalMoves) * 100 : 0;
  const isAtStart = !isBranching && moveIndex === 0;
  const isAtEnd = !isBranching && moveIndex === totalMoves;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="p-3 sm:p-4 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/lobby')} className="text-slate-400 hover:text-white transition-colors text-sm">
            ← Lobby
          </button>
          <h1 className="text-sm sm:text-lg font-bold text-white">
            🎓 Review: <span className="text-violet-400 font-mono text-sm">{matchId}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isBranching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <span className="px-2 py-1 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold">
                🔀 Self-Review Branch
              </span>
              <button
                onClick={exitBranch}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
              >
                Exit Branch
              </button>
            </motion.div>
          )}
          <div className="text-xs text-slate-500 font-mono">
            Move {isBranching ? `${moveIndex}+${branchIndex}` : moveIndex}/{totalMoves}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Board Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 gap-4 overflow-y-auto">
          {/* Player info */}
          <div className="flex items-center gap-4 text-sm">
            <span className={cn(
              'px-3 py-1 rounded-full font-bold border',
              displayState.currentPlayer === 'X' && !displayState.winner
                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            )}>
              X — {record.playerXName}
            </span>
            <span className="text-slate-600">vs</span>
            <span className={cn(
              'px-3 py-1 rounded-full font-bold border',
              displayState.currentPlayer === 'O' && !displayState.winner
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            )}>
              O — {record.playerOName}
            </span>
          </div>

          {/* Game result banner at end */}
          {!isBranching && moveIndex === totalMoves && record.winner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-sm border',
                record.winner === 'Draw'
                  ? 'bg-slate-700/50 text-slate-300 border-slate-600'
                  : record.winner === record.playerRole
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              )}
            >
              {record.winner === 'Draw' ? '🤝 Game Drawn' : `${record.winner} Wins`}
            </motion.div>
          )}

          {/* Board */}
          <SuperBoard
            gameState={displayState}
            playerRole={isBranching ? displayState.currentPlayer : 'Spectator'}
            hintMove={null}
            onCellClick={isBranching || !displayState.winner ? handleBranchMove : () => {}}
            lastMove={lastMove}
            bestMove={bestMoveForDisplay}
          />

          {/* Self-review hint */}
          {!isBranching && !displayState.winner && (
            <p className="text-xs text-slate-500 text-center">
              Click any valid cell to start a self-review branch from this position
            </p>
          )}
          {isBranching && (
            <p className="text-xs text-violet-400/70 text-center">
              Exploring alternate line — move {branchIndex} deep from position {moveIndex}
            </p>
          )}

          {/* Navigation Controls */}
          <div className="flex flex-col items-center gap-3 w-full max-w-md">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-violet-500 rounded-full"
                animate={{ width: `${moveProgress}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToStart}
                disabled={isAtStart}
                title="Go to start"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white font-mono transition-colors"
              >
                ⏮
              </button>
              <button
                onClick={goToPrev}
                disabled={isAtStart && !isBranching}
                title="Previous move"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-colors text-lg"
              >
                ‹
              </button>
              <span className="px-4 py-2 bg-slate-800 rounded-lg font-mono text-slate-300 text-sm min-w-[80px] text-center">
                {isBranching ? `${moveIndex}+${branchIndex}` : `${moveIndex} / ${totalMoves}`}
              </span>
              <button
                onClick={goToNext}
                disabled={isAtEnd && !isBranching}
                title="Next move"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-colors text-lg"
              >
                ›
              </button>
              <button
                onClick={goToEnd}
                disabled={isAtEnd}
                title="Go to end"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white font-mono transition-colors"
              >
                ⏭
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Coach Panel + Move List */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden">
          {/* Coach Analysis Panel */}
          <div className="flex-none p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Coach Analysis
            </h3>

            <AnimatePresence mode="wait">
              {activeLog && coachComment ? (
                <motion.div
                  key={`${selectedLogIndex ?? moveIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  {/* Label badge */}
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                    LABEL_STYLES[activeLog.label] ?? LABEL_STYLES['Forced']
                  )}>
                    <span>{LABEL_ICONS[activeLog.label]}</span>
                    <span>{activeLog.label}</span>
                  </div>

                  {/* Headline */}
                  <p className="text-sm font-semibold text-white">{coachComment.headline}</p>

                  {/* Detail */}
                  <p className="text-sm text-slate-400 leading-relaxed">{coachComment.detail}</p>

                  {/* Best move callout */}
                  {coachComment.bestMoveDescription && (
                    <div className="flex items-start gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="text-emerald-400 text-sm mt-0.5">★</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-400 mb-0.5">Best Move</p>
                        <p className="text-xs text-emerald-300/80">{coachComment.bestMoveDescription}</p>
                      </div>
                    </div>
                  )}

                  {/* Delta */}
                  {activeLog.label !== 'Forced' && activeLog.label !== 'Best Move' && (
                    <p className="text-xs text-slate-600">
                      Evaluation loss: <span className="text-amber-400 font-mono">{activeLog.delta}</span> pts
                    </p>
                  )}

                  {/* Self-review CTA */}
                  {!isBranching && (
                    <button
                      onClick={() => {
                        // jump to the position BEFORE this move so user can try alternatives
                        const logIdx = selectedLogIndex !== null ? selectedLogIndex : moveIndex - 1;
                        goToMoveIndex(logIdx);
                      }}
                      className="w-full mt-1 py-2 text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 border border-violet-500/30 rounded-lg font-semibold transition-colors"
                    >
                      Try from here →
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-slate-600 text-center py-4"
                >
                  {moveIndex === 0
                    ? 'Navigate to a move to see coach analysis'
                    : isBranching
                    ? 'Coach analysis is only for main-line moves'
                    : 'Select a move below'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Legend */}
          <div className="flex-none px-4 py-2 border-b border-slate-800 flex flex-wrap gap-2">
            {Object.entries(LABEL_ICONS).map(([label, icon]) => (
              <span key={label} className={cn(
                'text-xs px-1.5 py-0.5 rounded border font-mono',
                LABEL_STYLES[label]
              )}>
                {icon} {label}
              </span>
            ))}
          </div>

          {/* Move List */}
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
              Move History
            </h3>
            {record.accuracyLog.length === 0 ? (
              <p className="text-xs text-slate-600 px-1">No moves recorded.</p>
            ) : (
              <div className="space-y-1">
                {record.accuracyLog.map((log, idx) => {
                  const isSelected = selectedLogIndex === idx || (selectedLogIndex === null && moveIndex - 1 === idx);
                  const moveNum = idx + 1;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        goToMoveIndex(idx + 1);
                        setSelectedLogIndex(idx);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-xs',
                        isSelected
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      )}
                    >
                      {/* Move number */}
                      <span className="text-slate-600 font-mono w-5 text-right flex-none">{moveNum}.</span>

                      {/* Player badge */}
                      <span className={cn(
                        'font-bold flex-none w-4 text-center',
                        log.move.player === 'X' ? 'text-indigo-400' : 'text-rose-400'
                      )}>
                        {log.move.player}
                      </span>

                      {/* Board/cell info */}
                      <span className="text-slate-500 flex-1 truncate">
                        B{log.move.superGridIndex + 1}·{log.move.subGridIndex + 1}
                      </span>

                      {/* Accuracy label */}
                      <span className={cn(
                        'flex-none font-bold px-1 rounded',
                        LABEL_STYLES[log.label] ?? ''
                      )}>
                        {LABEL_ICONS[log.label]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
