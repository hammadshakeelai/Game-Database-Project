import { motion } from 'motion/react';
import type { MoveAccuracyLog } from '../types';
import { cn } from '../utils';

interface MoveLogProps {
  accuracyLog: MoveAccuracyLog[];
}

const LABEL_STYLES: Record<string, string> = {
  'Best Move': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'Good Move': 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  'Inaccuracy': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'Blunder': 'bg-red-500/10 border-red-500/20 text-red-400',
  'Forced': 'bg-slate-500/10 border-slate-500/20 text-slate-400',
};

const LABEL_ICONS: Record<string, string> = {
  'Best Move': '✓',
  'Good Move': '○',
  'Inaccuracy': '?!',
  'Blunder': '??',
  'Forced': '→',
};

/**
 * Move analysis sidebar showing accuracy labels for each move.
 */
export default function MoveLog({ accuracyLog }: MoveLogProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-800/50">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Move Analysis
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {accuracyLog.length === 0 ? (
          <p className="text-sm text-slate-500 text-center mt-4">
            Make a move to see AI analysis.
          </p>
        ) : (
          accuracyLog.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "p-3 rounded-xl border text-sm",
                LABEL_STYLES[log.label] || LABEL_STYLES['Forced']
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="text-base">{LABEL_ICONS[log.label]}</span>
                  Move {i + 1}
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-mono",
                    log.move.player === 'X'
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-rose-500/20 text-rose-300"
                  )}>
                    {log.move.player}
                  </span>
                </span>
                <span className="font-mono text-xs opacity-70">
                  Δ{log.delta.toFixed(0)}
                </span>
              </div>
              <div className="font-medium">{log.label}</div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
