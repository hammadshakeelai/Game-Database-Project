import { NavLink, Link } from 'react-router-dom';
import { LogOut, Swords, Trophy, User } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { cn } from '../utils';

/**
 * Persistent app navigation.
 *
 * Deliberately static: the design read spends the whole motion budget on the
 * board, and chrome that animates on every route change competes with it.
 */

const LINKS = [
  { to: '/play', label: 'Play', icon: Swords },
  { to: '/leaderboard', label: 'Standings', icon: Trophy },
  { to: '/me', label: 'You', icon: User },
];

export function AppNav() {
  const { profile, user, signOut } = useAuth();
  const name = profile?.displayName ?? user?.displayName ?? 'Player';
  const photo = profile?.photoURL ?? null;

  return (
    <header className="border-b border-slate-700/70">
      <nav className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link
          to="/play"
          className="ttt-display mr-1 hidden text-base font-semibold text-slate-100 sm:block"
        >
          Super&nbsp;TTT
        </Link>

        <ul className="flex flex-1 items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/play'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400',
                    isActive
                      ? 'bg-slate-800 text-indigo-300'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200',
                  )
                }
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {profile && (
          <span
            className="ttt-notation hidden text-sm text-indigo-300 sm:inline"
            title="Your rating"
          >
            {profile.elo}
          </span>
        )}

        <Link
          to="/me"
          className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
          aria-label={`Your profile, ${name}`}
        >
          {photo ? (
            <img
              src={photo}
              alt=""
              className="h-8 w-8 rounded-full border border-slate-600"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-slate-900">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="sr-only">Sign out</span>
        </button>
      </nav>
    </header>
  );
}

/** Standard page frame: nav plus a centred column. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppNav />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
