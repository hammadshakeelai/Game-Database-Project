import type { ConnectionState } from '../features/game/useSocket';
import { cn } from '../utils';

/**
 * Connection status, stated quietly.
 *
 * The previous banner pushed the whole page down while the socket was opening,
 * and greyed out every control on the way. That made a normal half-second of
 * connecting look like a fault. socket.io buffers emits made before the
 * connection is up, so nothing needed disabling in the first place: a click
 * during connect is queued and sent the moment the socket opens.
 *
 * So this reports and does not interrupt. It stays silent when healthy, and
 * only becomes loud when the connection is genuinely dead.
 */
export function ConnectionDot({
  connection,
  error,
}: {
  connection: ConnectionState;
  error: string | null;
}) {
  if (connection === 'connected') return null;

  const failed = connection === 'failed';
  const label = failed
    ? (error ?? 'Disconnected')
    : connection === 'reconnecting'
      ? 'Reconnecting'
      : 'Connecting';

  return (
    <span
      role="status"
      aria-live="polite"
      title={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium',
        failed ? 'bg-red-500/15 text-red-300' : 'ink-faint',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          failed ? 'bg-red-400' : 'animate-pulse bg-amber-400 motion-reduce:animate-none',
        )}
      />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
