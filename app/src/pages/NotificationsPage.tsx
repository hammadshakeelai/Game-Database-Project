import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import PageShell from '../components/PageShell';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_LABELS,
} from '../stores';
import type { Notification, NotificationType } from '../types';
import { cn, formatTimeAgo } from '../utils';

const TYPE_COLORS: Record<NotificationType, string> = {
  friend_request: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  tournament_invite: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  game_result: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  group_invite: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  rank_update: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  chat_message: 'bg-slate-600/20 text-slate-400 border-slate-500/40',
};

const FILTERS: { key: 'all' | 'unread' | NotificationType; label: string }[] = [
  { key: 'all',              label: 'All' },
  { key: 'unread',           label: 'Unread' },
  { key: 'friend_request',   label: 'Friends' },
  { key: 'tournament_invite',label: 'Tournaments' },
  { key: 'group_invite',     label: 'Groups' },
  { key: 'game_result',      label: 'Games' },
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const me = user?.uid ?? '';

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const r = () => setTick(t => t + 1);
    window.addEventListener('notifications-updated', r);
    return () => window.removeEventListener('notifications-updated', r);
  }, []);

  const items = useMemo(() => listNotifications(me), [me, tick]);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');

  const filtered = items.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    return n.type === filter;
  });

  const unread = items.filter(n => !n.is_read).length;

  return (
    <PageShell
      title="Notifications"
      subtitle={`${items.length} total · ${unread} unread`}
      actions={
        unread > 0 ? (
          <button
            onClick={() => markAllNotificationsRead(me)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
          >
            Mark all read
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-1 mb-5 p-1 bg-slate-800 rounded-lg border border-slate-700 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-semibold transition-colors',
              filter === f.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center text-sm text-slate-500">
          No notifications to show.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map(n => (
            // @ts-expect-error React key prop
            <Row key={n.nid} n={n} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function Row({ n }: { n: Notification }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-slate-800 border rounded-xl p-4 flex items-start gap-3 transition-colors',
        n.is_read ? 'border-slate-700' : 'border-indigo-500/40 shadow-sm shadow-indigo-500/10',
      )}
    >
      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap mt-0.5', TYPE_COLORS[n.type])}>
        {NOTIFICATION_LABELS[n.type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{n.content}</p>
        <p className="text-[11px] text-slate-500 mt-1">{formatTimeAgo(n.created_at)}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!n.is_read && (
          <button
            onClick={() => markNotificationRead(n.nid)}
            className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-md font-semibold"
          >
            Mark read
          </button>
        )}
        <button
          onClick={() => deleteNotification(n.nid)}
          className="text-xs px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-md font-semibold"
        >
          Dismiss
        </button>
      </div>
    </motion.li>
  );
}
