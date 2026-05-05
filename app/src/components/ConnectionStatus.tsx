import { cn } from '../utils';
import type { ConnectionStatus as Status } from '../hooks/useSocket';

interface ConnectionStatusProps {
  status: Status;
  error?: string | null;
}

export default function ConnectionStatus({ status, error }: ConnectionStatusProps) {
  const configs: Record<Status, { color: string; label: string; pulse: boolean }> = {
    connected: { color: 'bg-emerald-500', label: 'Connected', pulse: false },
    connecting: { color: 'bg-amber-500', label: 'Connecting...', pulse: true },
    disconnected: { color: 'bg-red-500', label: 'Disconnected', pulse: true },
    error: { color: 'bg-red-500', label: 'Error', pulse: false },
  };

  const config = configs[status];

  return (
    <div className="flex items-center gap-2" title={error || config.label}>
      <div className={cn("w-2.5 h-2.5 rounded-full", config.color, config.pulse && "animate-pulse")} />
      <span className={cn(
        "text-xs font-medium",
        status === 'connected' ? "text-emerald-400" :
        status === 'connecting' ? "text-amber-400" :
        "text-red-400"
      )}>
        {config.label}
      </span>
    </div>
  );
}
