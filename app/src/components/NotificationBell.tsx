import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_LABELS,
  unreadCount,
} from '../stores';
import type { Notification } from '../types';
import { cn, formatTimeAgo } from '../utils';

const TYPE_COLORS: Record<string, string> = {
  friend_request: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  tournament_invite: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  game_result: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  group_invite: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  rank_update: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  chat_message: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      setItems(listNotifications(user.uid).slice(0, 10));
      setUnread(unreadCount(user.uid));
    };
    refresh();
    window.addEventListener('notifications-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('notifications-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2 2 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.052-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h4 className="text-sm font-bold text-white">Notifications</h4>
              {unread > 0 && (
                <button
                  onClick={() => markAllNotificationsRead(user.uid)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No notifications yet.</p>
              ) : (
                items.map(n => (
                  <button
                    key={n.nid}
                    onClick={() => markNotificationRead(n.nid)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 border-b border-slate-700/50 last:border-b-0 text-left transition-colors',
                      n.is_read ? 'bg-transparent' : 'bg-indigo-500/5 hover:bg-indigo-500/10',
                    )}
                  >
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap mt-0.5', TYPE_COLORS[n.type])}>
                      {NOTIFICATION_LABELS[n.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{n.content}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatTimeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />}
                  </button>
                ))
              )}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center py-2.5 text-xs font-semibold text-indigo-600 hover:bg-slate-700 border-t border-slate-700"
            >
              View all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
