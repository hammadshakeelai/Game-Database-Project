import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PageShell from '../components/PageShell';
import {
  changeGroupRole,
  deleteGroup,
  getGroup,
  getUsername,
  inviteToGroup,
  isGroupMember,
  joinGroup,
  leaveGroup,
  listAcceptedFriends,
  listGroupMembers,
} from '../stores';
import type { GroupRole } from '../types';
import { cn, formatDate } from '../utils';

const ROLE_COLORS: Record<GroupRole, string> = {
  owner: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  admin: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  moderator: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  member: 'bg-slate-600/20 text-slate-400 border-slate-500/40',
};

export default function GroupDetailPage() {
  const { gid } = useParams<{ gid: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const me = user?.uid ?? '';

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
  const isOwner = myMembership?.role === 'owner';
  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

  const [inviteOpen, setInviteOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const flash = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(null), 2500); };

  if (!group) {
    return (
      <PageShell title="Group not found">
        <p className="text-slate-400">This group doesn't exist or has been deleted.</p>
        <Link to="/groups" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-semibold">
          Back to groups
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
      flash('Owners must delete the group instead of leaving.');
      return;
    }
    leaveGroup(group.gid, me);
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${group.group_name}"? This cannot be undone.`)) return;
    deleteGroup(group.gid);
    navigate('/groups');
  };

  return (
    <PageShell
      title={group.group_name}
      subtitle={`${members.length} / ${group.max_members} members · ${group.is_public ? 'Public' : 'Private'} · created ${formatDate(group.created_at)}`}
      actions={
        <>
          {myMembership ? (
            <>
              {!isOwner && (
                <button
                  onClick={handleLeave}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold"
                >
                  Leave
                </button>
              )}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm font-semibold"
                >
                  Delete Group
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
                >
                  Invite Friend
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleJoin}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
            >
              Join Group
            </button>
          )}
        </>
      }
    >
      {feedback && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-sm">
          {feedback}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">About</h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {group.description || 'No description provided.'}
            </p>
            <dl className="mt-5 space-y-2 text-xs">
              <Stat label="Owner" value={getUsername(group.owner_pid)} />
              <Stat label="Visibility" value={group.is_public ? 'Public' : 'Private'} />
              <Stat label="Capacity" value={`${members.length} / ${group.max_members}`} />
              <Stat label="Created" value={formatDate(group.created_at)} />
            </dl>
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Members</h2>
            </div>
            <ul className="divide-y divide-slate-700/60">
              {members.map(m => (
                <li key={m.pid} className="px-6 py-4 flex items-center justify-between gap-3">
                  <Link to={`/profile/${m.pid}`} className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {getUsername(m.pid)[0].toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{getUsername(m.pid)}</p>
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
                        onChange={e => changeGroupRole(group.gid, m.pid, e.target.value as GroupRole)}
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
    </PageShell>
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
            None of your friends are eligible to invite (already members, or you have no friends yet).
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {invitable.map(pid => (
              <li key={pid} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-700/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
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
