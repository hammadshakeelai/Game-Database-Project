import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import type { AccuracyLabel, MoveAccuracyLog } from '../../types';
import { cn } from '../../utils';
import type { ChatMessage, Mark, Role } from './types';

/**
 * The analysis column: evaluation, the graded move list, and match chat.
 *
 * Everything here is server-computed. The browser never re-runs minimax; it
 * renders what the authoritative engine already decided as it applied each move.
 *
 * Density is high and motion is nil by design: this column sits beside the
 * board, and the board owns the whole motion budget.
 */

const POSITIONS = ['TL', 'TC', 'TR', 'ML', 'C', 'MR', 'BL', 'BC', 'BR'];

/** Scoresheet notation for a move: which board, which square. */
export function notate(superIdx: number, subIdx: number): string {
  return `${POSITIONS[superIdx]}/${POSITIONS[subIdx]}`;
}

const LABEL_STYLE: Record<AccuracyLabel, string> = {
  'Best Move': 'text-emerald-300',
  'Good Move': 'text-slate-300',
  Forced: 'text-slate-500',
  Inaccuracy: 'text-amber-300',
  Blunder: 'text-rose-300',
};

const LABEL_SHORT: Record<AccuracyLabel, string> = {
  'Best Move': 'best',
  'Good Move': 'good',
  Forced: 'forced',
  Inaccuracy: '?!',
  Blunder: '??',
};

// ---------------------------------------------------------------------------

/**
 * Which side the engine currently favours.
 *
 * Shown as a proportion plus a signed number, because a bar alone cannot be
 * read by someone who cannot separate the two colours.
 */
export function EvalBar({ evaluation }: { evaluation: number }) {
  // The raw heuristic is unbounded; squash it so the bar stays meaningful.
  const clamped = Math.max(-1, Math.min(1, evaluation / 100));
  const xShare = Math.round((clamped + 1) * 50);
  const leader = clamped > 0.05 ? 'X' : clamped < -0.05 ? 'O' : null;

  return (
    <section aria-label="Engine evaluation">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Evaluation</h3>
        <span className="ttt-notation text-xs text-slate-400">
          {leader === null ? 'level' : `${leader} ahead`}
        </span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full border border-slate-700 bg-slate-900"
        role="img"
        aria-label={
          leader === null
            ? 'The position is level'
            : `${leader} is ahead, ${leader === 'X' ? xShare : 100 - xShare} percent`
        }
      >
        <div className="bg-slate-300" style={{ width: `${xShare}%` }} />
        <div className="bg-rose-400" style={{ width: `${100 - xShare}%` }} />
      </div>
      <div className="ttt-notation mt-1 flex justify-between text-[10px] text-slate-500">
        <span>X</span>
        <span>O</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** The graded move list, newest last, the way a scoresheet reads. */
export function MoveLog({ log }: { log: MoveAccuracyLog[] }) {
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [log.length]);

  return (
    <section aria-label="Move list">
      <h3 className="mb-1.5 text-sm font-semibold text-slate-200">Moves</h3>
      {log.length === 0 ? (
        <p className="text-xs text-slate-500">No moves yet.</p>
      ) : (
        <ol className="max-h-44 overflow-y-auto rounded-md border border-slate-700 bg-slate-900/50">
          {log.map((entry, i) => (
            <li
              key={i}
              ref={i === log.length - 1 ? endRef : undefined}
              className="ttt-notation flex items-center gap-2 border-b border-slate-700/40 px-2.5 py-1.5 text-xs last:border-0"
            >
              <span className="w-5 shrink-0 text-slate-500">{i + 1}</span>
              <span
                className={cn(
                  'w-4 shrink-0 font-semibold',
                  entry.move.player === 'X' ? 'text-slate-100' : 'text-rose-300',
                )}
              >
                {entry.move.player}
              </span>
              <span className="flex-1 text-slate-300">
                {notate(entry.move.superGridIndex, entry.move.subGridIndex)}
              </span>
              <span className={cn('shrink-0', LABEL_STYLE[entry.label])} title={entry.label}>
                {LABEL_SHORT[entry.label]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

/** Match chat. Server-side rate limited; the sender name comes from the token. */
export function ChatPanel({
  messages,
  onSend,
  myUid,
  disabled,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myUid: string | undefined;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <section aria-label="Match chat">
      <h3 className="mb-1.5 text-sm font-semibold text-slate-200">Chat</h3>

      <ul className="mb-2 max-h-40 min-h-16 overflow-y-auto rounded-md border border-slate-700 bg-slate-900/50 px-2.5 py-2">
        {messages.length === 0 ? (
          <li className="text-xs text-slate-500">Say hello. Messages stay in this game.</li>
        ) : (
          messages.map((msg, i) => (
            <li
              key={`${msg.at}-${i}`}
              ref={i === messages.length - 1 ? endRef : undefined}
              className="mb-1 text-xs last:mb-0"
            >
              <span
                className={cn(
                  'font-semibold',
                  msg.senderUid === myUid ? 'text-indigo-300' : 'text-slate-300',
                )}
              >
                {msg.senderName}
              </span>
              <span className="text-slate-500">: </span>
              <span className="break-words text-slate-300">{msg.text}</span>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={submit} className="flex gap-1.5">
        <label htmlFor="chat-input" className="sr-only">
          Message your opponent
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          maxLength={500}
          disabled={disabled}
          placeholder={disabled ? 'Chat is for players' : 'Message…'}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || draft.trim().length === 0}
          className="shrink-0 rounded-md bg-indigo-700 px-2.5 text-slate-100 transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 disabled:opacity-40 motion-reduce:hover:scale-100"
        >
          <Send size={14} aria-hidden="true" />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function AnalysisColumn({
  evaluation,
  log,
  messages,
  onSend,
  myUid,
  role,
}: {
  evaluation: number;
  log: MoveAccuracyLog[];
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myUid: string | undefined;
  role: Role;
}) {
  return (
    <aside className="flex w-full flex-col gap-5 rounded-lg border border-slate-700 bg-slate-800/50 p-4 lg:w-72 lg:shrink-0">
      <EvalBar evaluation={evaluation} />
      <MoveLog log={log} />
      <ChatPanel
        messages={messages}
        onSend={onSend}
        myUid={myUid}
        disabled={role === 'spectator'}
      />
    </aside>
  );
}

export type { Mark };
