import { NavLink, Link } from 'react-router-dom';
import { Bell, LogOut, Moon, Radio, Sun, Swords, Trophy, User, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useTheme } from '../features/theme/ThemeContext';
import { cn } from '../utils';

/**
 * App chrome.
 *
 * Desktop and phone get genuinely different navigation, because they have
 * genuinely different constraints. Desktop has room for a persistent rail that
 * also carries live activity; a phone does not, so it gets thumb-reachable
 * bottom tabs and the live panel becomes its own destination.
 *
 * Content is full-bleed. No centred max-width column: the client called that
 * out, and a dense product with dead gutters looks unfinished.
 */

interface NavItem {
  to: string;
  label: string;
  icon: typeof Swords;
  end?: boolean;
}

const PRIMARY: NavItem[] = [
  { to: '/play', label: 'Play', icon: Swords, end: true },
  { to: '/live', label: 'Live', icon: Radio },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/leaderboard', label: 'Ratings', icon: Trophy },
  { to: '/me', label: 'Profile', icon: User },
];

/** Shown in the rail only: the phone tab bar has room for five, not seven. */
const SECONDARY: NavItem[] = [
  { to: '/clans', label: 'Clans', icon: Users },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
];

export function AppShell({
  children,
  title,
  actions,
  wide = false,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  /** Let the page manage its own padding, for the board screen. */
  wide?: boolean;
}) {
  return (
    <div className="surface-bg flex min-h-dvh flex-col lg:flex-row">
      <DesktopRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} actions={actions} />
        <main className={cn('flex-1', wide ? '' : 'px-4 py-5 sm:px-6', 'pb-20 lg:pb-6')}>
          {children}
        </main>
      </div>

      <PhoneTabs />
    </div>
  );
}

// ---------------------------------------------------------------------------

function DesktopRail() {
  const { profile, user, signOut } = useAuth();
  const name = profile?.displayName ?? user?.displayName ?? 'Player';

  return (
    <aside className="edge surface-panel hidden w-56 shrink-0 flex-col border-r lg:flex">
      <Link
        to="/play"
        className="ttt-display edge flex items-center gap-2 border-b px-4 py-4 text-base font-bold text-indigo-300"
      >
        SUPER TTT
      </Link>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {PRIMARY.map(item => (
            <RailLink key={item.to} item={item} />
          ))}
        </ul>

        <p className="ink-faint px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wider uppercase">
          Community
        </p>
        <ul className="space-y-0.5">
          {SECONDARY.map(item => (
            <RailLink key={item.to} item={item} />
          ))}
        </ul>
      </nav>

      <div className="edge flex items-center gap-2 border-t p-3">
        <Link
          to="/me"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 hover:surface-raised"
        >
          <Avatar name={name} photo={profile?.photoURL ?? null} size={28} />
          <span className="min-w-0 flex-1">
            <span className="ink block truncate text-sm font-medium">{name}</span>
            {profile && (
              <span className="ttt-notation block text-xs text-indigo-300">{profile.elo}</span>
            )}
          </span>
        </Link>
        <ThemeButton />
        <button
          type="button"
          onClick={() => void signOut()}
          className="ink-faint rounded-md p-2 hover:surface-raised hover:ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="sr-only">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function RailLink({ item }: { item: NavItem }) {
  const { to, label, icon: Icon, end } = item;
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400',
            isActive ? 'bg-indigo-700 text-slate-100' : 'ink-muted hover:surface-raised hover:ink',
          )
        }
      >
        <Icon size={16} aria-hidden="true" />
        {label}
      </NavLink>
    </li>
  );
}

// ---------------------------------------------------------------------------

function TopBar({ title, actions }: { title?: string; actions?: ReactNode }) {
  return (
    <header className="edge surface-panel sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 sm:px-6">
      <Link to="/play" className="ttt-display text-sm font-bold text-indigo-300 lg:hidden">
        SUPER TTT
      </Link>
      {title && (
        <h1 className="ttt-display ink hidden truncate text-lg font-bold lg:block">{title}</h1>
      )}
      <div className="flex flex-1 items-center justify-end gap-1.5">
        {actions}
        <Link
          to="/notifications"
          className="ink-faint rounded-md p-2 hover:surface-raised hover:ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          <Bell size={17} aria-hidden="true" />
          <span className="sr-only">Notifications</span>
        </Link>
        <span className="lg:hidden">
          <ThemeButton />
        </span>
      </div>
    </header>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="ink-faint rounded-md p-2 hover:surface-raised hover:ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
    >
      {theme === 'night' ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
      <span className="sr-only">Switch to {theme === 'night' ? 'day' : 'night'} theme</span>
    </button>
  );
}

// ---------------------------------------------------------------------------

/** Thumb-reachable tabs. Five is the most that stays legible at 360px. */
function PhoneTabs() {
  return (
    <nav
      className="edge surface-panel fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main"
    >
      {PRIMARY.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium',
              isActive ? 'text-indigo-300' : 'ink-faint',
            )
          }
        >
          <Icon size={19} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------

export function Avatar({
  name,
  photo,
  size = 32,
}: {
  name: string;
  photo: string | null;
  size?: number;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="edge shrink-0 rounded-full border"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-indigo-700 font-semibold text-slate-100"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
