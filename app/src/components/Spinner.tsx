import { cn } from '../utils';

interface SpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

/**
 * Loading indicator. Always carries an accessible label so a screen reader
 * announces that something is happening rather than reading nothing at all.
 */
export function Spinner({ label = 'Loading', size = 'md', inline = false }: SpinnerProps) {
  const dimensions = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];

  const ring = (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400 motion-reduce:animate-none',
        dimensions,
      )}
    />
  );

  if (inline) {
    return (
      <>
        {ring}
        <span className="sr-only">{label}</span>
      </>
    );
  }

  return (
    <div role="status" className="flex flex-col items-center gap-3">
      {ring}
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}
