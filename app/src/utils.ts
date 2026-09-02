import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes intelligently.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/** Stable key for a board coordinate, used by the AI's transposition cache. */
export function moveToKey(superIdx: number, subIdx: number): string {
  return `${superIdx}-${subIdx}`;
}
