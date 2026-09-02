import { AnimatePresence, motion } from 'motion/react';
import type { ConnectionState } from '../features/game/useSocket';

/**
 * Connection status. Silent while healthy — a permanent "connected" badge is
 * noise; players only need to hear from this when something is wrong.
 */
export function ConnectionBanner({
  connection,
  error,
}: {
  connection: ConnectionState;
  error: string | null;
}) {
  const visible = connection === 'reconnecting' || connection === 'failed' || connection === 'connecting';
  if (!visible) return null;

  const failed = connection === 'failed';
  const message = failed
    ? (error ?? 'Connection lost.')
    : connection === 'connecting'
      ? 'Connecting…'
      : 'Connection interrupted. Reconnecting…';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        role="status"
        aria-live="polite"
        className={
          'mb-4 flex items-center gap-2.5 overflow-hidden rounded-xl px-4 py-2.5 text-sm ' +
          (failed ? 'bg-red-500/15 text-red-200' : 'bg-amber-500/15 text-amber-100')
        }
      >
        {!failed && (
          <span
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        {message}
      </motion.div>
    </AnimatePresence>
  );
}
