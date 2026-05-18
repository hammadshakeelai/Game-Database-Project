import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import PageShell from '../components/PageShell';
import ChatBox from '../components/ChatBox';
import { useSocket } from '../hooks/useSocket';
import {
  changeGroupRole,
  deleteGroup,
  getGroup,
  getUsername,
  inviteToGroup,
  joinGroup,
  leaveGroup,
  listAcceptedFriends,
  listGroupMembers,
} from '../stores';
import type { GroupRole } from '../types';
import { cn, formatDate } from '../utils';

const ROLE_COLORS: Record<GroupRole, string> = {
  owner:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  admin:     'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  moderator: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  member:    'bg-slate-600/30 text-slate-300 border-slate-500/40',
};

interface ChatMsg {
  sender: string;
  message: string;
  timestamp: number;
}

export default function GroupDetailPage() {
  const { gid } = useParams<{ gid: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const me = user?.uid ?? '';
  const { socket } = useSocket();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const r = () => setTick(t => t + 1);
    window.addEventListener('groups-updated', r);
    return () => window.removeEventListener('groups-updated', r);
  }, []);

  const group = useMemo(() => (gid ? getGroup(gid) : undefined), [gid, tick]);
  const members = useMemo(() => (gid ? listGroupMembers(gid) : []), [gid, tick]);
  const friends = useMemo(() => listAcceptedFriends(me), [me, tick]);

  const myMembership = members.find(m => m.pid === me);
  const isMember = !!myMembership;
  const isOwner = myMembership?.role === 'owner';
  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const flash = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(null), 2500); };

  // ─────────────────────────────────────────────────────────────
  // Clan chat: join the clan room, listen for messages, send on submit
  // ─────────────────────────────────────────────────────────────
  const roomId = useMemo(() => (gid ? `clan_${gid}` : ''), [gid]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    if (!socket || !roomId || !isMember) return;
    socket.emit('join_room', { roomId });
    const onMsg = (data: ChatMsg & { roomId?: string }) => {
      if (data.roomId && data.roomId !== roomId) return;
      setChatMessages(prev => [...prev, { sender: data.sender, message: data.message, timestamp: data.timestamp }]);
    };
    socket.on('receive_message', onMsg);
    return () => {
      socket.off('receive_message', onMsg);
      socket.emit('leave_room', { roomId });
    };
  }, [socket, roomId, isMember]);

  const sendChat = (message: string) => {
    if (!socket || !roomId || !profile) return;
    socket.emit('send_message', {
      roomId,
      sender: profile.username,
      message,
      timestamp: Date.now(),
    });
  };

  if (!group) {
    return (
      <PageShell title="Clan not found">
        <p className="text-slate-400">This clan doesn't exist or has been disbanded.</p>
        <Link to="/groups" className="inline-block mt-4 text-indigo-300 hover:text-indigo-200 font-semibold">
          Back to clans
        </Link>
      </PageShell>
    );
  }

  const handleJoin = () => {
    const r = joinGroup(group.gid, me);
    if (!r.ok) flash(r.reason ?? 'Could not join.');
  };

  const handleLeave = () => {
    if (isOwner) {
      flash('Owners must disband the clan instead of leaving.');
      setConfirmLeave(false);
      return;
    }
    leaveGroup(group.gid, me);
    setConfirmLeave(false);
    flash('You have left the clan.');
  };

  const handleDelete = () => {
    if (!confirm(`Disband "${group.group_name}"? This cannot be undone.`)) return;
    deleteGroup(group.gid);
    navigate('/groups');
  };

  // ─────────────────────────────────────────────────────────────
  // Non-member view — hero Join card
  // ─────────────────────────────────────────────────────────────
  if (!isMember) {
    return (
      <PageShell
        title={group.group_name}
        subtitle={`${members.length} / ${group.max_members} members · ${group.is_public ? 'Public' : 'Private'} clan`}
      >
        {feedback && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm">
            {feedback}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-indigo-700/40 via-slate-800 to-violet-800/30 border border-indigo-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl"
        >
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-5xl font-black text-white shadow-xl shadow-indigo-700/40 shrink-0 border border-indigo-300/40">
              {group.group_name[0].toUpperCase()}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl font-black text-white font-serif tracking-tight">
                {group.group_name}
              </h2>
              <p className="text-slate-300 mt-2 max-w-xl">
                {group.description || 'A clan of competitive players.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
                <Chip>{members.length} / {group.max_members} members</Chip>
                <Chip>{group.is_public ? 'Open to all' : 'Invite only'}</Chip>
                <Chip>Founded {formatDate(group.created_at)}</Chip>
                <Chip>Led by {getUsername(group.owner_pid)}</Chip>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={handleJoin}
                  disabled={!group.is_public || members.length >= group.max_members}
                  className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-indigo-700/40 transition-all hover:scale-[1.03] active:scale-[0.98]"
                >
                  {members.length >= group.max_members ? 'Clan is full' : group.is_public ? 'Join Clan' : 'Invite Only'}
                </button>
                <Link
                  to="/groups"
                  className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Browse other clans
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        <section className="mt-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Roster · {members.length}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Join the clan to chat with these players.</p>
            </div>
            <MemberList members={members} isOwner={false} me={me} groupId={group.gid} />
          </div>
        </section>
      </PageShell>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Member view — chat + roster + leave
  // ─────────────────────────────────────────────────────────────
  return (
    <PageShell
      title={group.group_name}
      subtitle={`${members.length} / ${group.max_members} members · ${group.is_public ? 'Public' : 'Private'} · founded ${formatDate(group.created_at)}`}
      actions={
        <>
          {isAdmin && (
            <button
              onClick={() => setInviteOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
            >
              Invite Friend
            </button>
          )}
          {isOwner ? (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40 rounded-lg text-sm font-semibold"
            >
              Disband Clan
            </button>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40 rounded-lg text-sm font-semibold"
            >
              Leave Clan
            </button>
          )}
        </>
      }
    >
      {feedback && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm">
          {feedback}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: about + roster */}
        <section className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">About</h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {group.description || 'No description provided.'}
            </p>
            <dl className="mt-5 space-y-2 text-xs">
              <Stat label="Owner" value={getUsername(group.owner_pid)} />
              <Stat label="Visibility" value={group.is_public ? 'Public' : 'Private'} />
              <Stat label="Capacity" value={`${members.length} / ${group.max_members}`} />
              <Stat label="Founded" value={formatDate(group.created_at)} />
            </dl>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <h2 className="text-sm font-bold text-white">Clanmates · {members.length}</h2>
            </div>
            <MemberList members={members} isOwner={isOwner} me={me} groupId={group.gid} />
          </div>
        </section>

        {/* Right: chat */}
        <section className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden h-[600px] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-indigo-900/40 to-violet-900/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white">Clan Chat</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{members.length} clanmates</span>
            </div>
            <div className="flex-1 min-h-0">
              <ChatBox
                messages={chatMessages}
                onSend={sendChat}
                currentUserName={profile?.username || ''}
                title="Clan Chat"
                placeholder={`Message ${group.group_name}...`}
                emptyMessage="No messages yet. Say hello to your clanmates."
              />
            </div>
          </div>
        </section>
      </div>

      {inviteOpen && (
        <InviteModal
          gid={group.gid}
          me={me}
          friends={friends.map(f => f.friend_pid)}
          alreadyMembers={members.map(m => m.pid)}
          onClose={() => setInviteOpen(false)}
          onInvite={pid => {
            const r = inviteToGroup(group.gid, me, pid);
            flash(r.ok ? 'Invitation sent.' : (r.reason ?? 'Could not invite.'));
          }}
        />
      )}

      {confirmLeave && (
        <ConfirmLeaveModal
          clanName={group.group_name}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={handleLeave}
        />
      )}
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-600 text-slate-200">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-200 font-medium text-right">{value}</dd>
    </div>
  );
}

function MemberList({
  members,
  isOwner,
  me,
  groupId,
}: {
  members: { pid: string; role: GroupRole; joined_at: number }[];
  isOwner: boolean;
  me: string;
  groupId: string;
}) {
  return (
    <ul className="divide-y divide-slate-700/60 max-h-[440px] overflow-y-auto">
      {members.map(m => (
        <li key={m.pid} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-700/20 transition-colors">
          <Link to={`/profile/${m.pid}`} className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
              {getUsername(m.pid)[0].toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {getUsername(m.pid)}
                {m.pid === me && <span className="ml-1.5 text-[10px] text-indigo-300 font-bold">(you)</span>}
              </p>
              <p className="text-xs text-slate-500">Joined {formatDate(m.joined_at)}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider', ROLE_COLORS[m.role])}>
              {m.role}
            </span>
            {isOwner && m.pid !== me && (
              <select
                value={m.role}
                onChange={e => changeGroupRole(groupId, m.pid, e.target.value as GroupRole)}
                className="text-xs bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="member">Member</option>
              </select>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ConfirmLeaveModal({
  clanName,
  onCancel,
  onConfirm,
}: {
  clanName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white font-serif mb-2">Leave clan?</h3>
        <p className="text-sm text-slate-400 mb-5">
          You will be removed from <span className="text-white font-semibold">{clanName}</span> and lose access to its chat. You can rejoin later if it remains public.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
          >
            Leave Clan
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InviteModal({
  gid,
  me,
  friends,
  alreadyMembers,
  onClose,
  onInvite,
}: {
  gid: string;
  me: string;
  friends: string[];
  alreadyMembers: string[];
  onClose: () => void;
  onInvite: (pid: string) => void;
}) {
  const invitable = friends.filter(f => !alreadyMembers.includes(f));
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-white font-serif mb-4">Invite a Friend</h3>
        {invitable.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            None of your friends are eligible to invite (already in the clan, or you have no friends yet).
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {invitable.map(pid => (
              <li key={pid} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-700/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {getUsername(pid)[0].toUpperCase()}
                  </span>
                  <span className="text-sm text-white truncate">{getUsername(pid)}</span>
                </div>
                <button
                  onClick={() => onInvite(pid)}
                  className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold"
                >
                  Invite
                </button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold">
          Close
        </button>
      </div>
    </div>
  );
}
