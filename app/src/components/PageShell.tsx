import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, localSignOut } from '../AuthContext';
import NotificationBell from './NotificationBell';
import ModeToggle from './ModeToggle';
import { cn } from '../utils';

interface PageShellProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Optional element rendered in the page-title area (e.g. action button) */
  actions?: React.ReactNode;
}

const NAV = [
  { to: '/lobby',        label: 'Lobby' },
  { to: '/tournaments',  label: 'Tournaments' },
  { to: '/groups',       label: 'Clans' },
  { to: '/friends',      label: 'Friends' },
  { to: '/leaderboard',  label: 'Leaderboard' },
];

export default function PageShell({ title, subtitle, children, actions }: PageShellProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link to="/lobby" className="font-black text-lg text-indigo-600 tracking-tight font-serif hidden sm:block">
            SuperTTT
          </Link>

          <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/lobby'}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-800',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <ModeToggle />
            <NotificationBell />
            <Link
              to={`/profile/${user?.uid}`}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <span className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </span>
              <span className="text-sm font-semibold text-white max-w-[100px] truncate">
                {profile?.username ?? 'Player'}
              </span>
            </Link>
            <button
              onClick={() => { localSignOut(); window.location.href = '/'; }}
              className="text-slate-400 hover:text-red-500 transition-colors text-sm font-medium px-2"
              title="Sign out"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Page title bar */}
      {(title || actions) && (
        <div className="border-b border-slate-700 bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <button
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/lobby'))}
                className="text-slate-400 hover:text-white transition-colors text-sm mb-2 inline-flex items-center gap-1"
              >
                &larr; Back
              </button>
              {title && <h1 className="text-2xl sm:text-3xl font-bold text-white font-serif tracking-tight">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
