import { useTheme } from '../ThemeContext';

/**
 * Compact sun/moon button that flips between dark and bright modes.
 */
export default function ModeToggle() {
  const { mode, toggleMode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <button
      onClick={toggleMode}
      title={isDark ? 'Switch to bright mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to bright mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500/50 transition-colors flex items-center justify-center text-slate-300"
    >
      {isDark ? (
        /* Sun — click to go bright */
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* Moon — click to go dark */
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      )}
    </button>
  );
}
