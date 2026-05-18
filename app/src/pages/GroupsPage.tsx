import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import PageShell from '../components/PageShell';
import {
  createGroup,
  getUsername,
  isGroupMember,
  joinGroup,
  listGroupMembers,
  listGroups,
  listGroupsForPlayer,
} from '../stores';
import type { Group } from '../types';
import { cn, formatDate } from '../utils';

export default function GroupsPage() {
  const { user } = useAuth();
  const me = user?.uid ?? '';

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const r = () => setTick(t => t + 1);
    window.addEventListener('groups-updated', r);
    return () => window.removeEventListener('groups-updated', r);
  }, []);

  const allGroups = useMemo(() => listGroups(), [tick]);
  const myGroups = useMemo(() => listGroupsForPlayer(me), [me, tick]);
  const publicGroups = useMemo(
    () => allGroups.filter(g => g.is_public && !myGroups.some(m => m.gid === g.gid)),
    [allGroups, myGroups],
  );

  const [showCreate, setShowCreate] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleJoin = (g: Group) => {
    if (isGroupMember(g.gid, me)) return;
    const r = joinGroup(g.gid, me);
    if (!r.ok) {
      setFeedback(r.reason ?? 'Could not join.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <PageShell
      title="Clans"
      subtitle="Player-run clans. Join a clan to chat with clanmates and organise practice sessions."
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-500/20"
        >
          Create Clan
        </button>
      }
    >
      {feedback && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/15 text-red-500 border border-red-500/30 text-sm">
          {feedback}
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">My Clans</h2>
        {myGroups.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-sm text-slate-500">
            You are not in any clans yet. Browse public clans below or create your own.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map(g => (
              // @ts-expect-error React key prop
              <GroupCard key={g.gid} group={g} isMember />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Public Clans</h2>
        {publicGroups.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-sm text-slate-500">
            No public clans to join right now.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicGroups.map(g => (
              // @ts-expect-error React key prop
              <GroupCard key={g.gid} group={g} onJoin={() => handleJoin(g)} />
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateGroupModal
          ownerPid={me}
          onClose={() => setShowCreate(false)}
        />
      )}
    </PageShell>
  );
}

function GroupCard({
  group,
  isMember,
  onJoin,
}: {
  group: Group;
  isMember?: boolean;
  onJoin?: () => void;
}) {
  const memberCount = listGroupMembers(group.gid).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-indigo-500/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <Link to={`/groups/${group.gid}`} className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white truncate hover:text-indigo-600 transition-colors">
            {group.group_name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {memberCount} / {group.max_members} members · {group.is_public ? 'Public' : 'Private'}
          </p>
        </Link>
        {!group.is_public && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-semibold uppercase tracking-wider">
            Private
          </span>
        )}
      </div>

      {group.description && (
        <p className="text-sm text-slate-400 line-clamp-3">{group.description}</p>
      )}

      <p className="text-[11px] text-slate-500">
        Owned by <span className="text-indigo-600 font-medium">{getUsername(group.owner_pid)}</span> · {formatDate(group.created_at)}
      </p>

      <div className="mt-auto pt-2 flex gap-2">
        <Link
          to={`/groups/${group.gid}`}
          className="flex-1 text-center py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Open
        </Link>
        {!isMember && onJoin && (
          <button
            onClick={onJoin}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Join
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CreateGroupModal({ ownerPid, onClose }: { ownerPid: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState(20);
  const [isPublic, setIsPublic] = useState(true);

  const submit = () => {
    if (name.trim().length < 3) return;
    createGroup({
      group_name: name.trim(),
      description: description.trim(),
      owner_pid: ownerPid,
      banner_url: null,
      max_members: maxMembers,
      is_public: isPublic,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-2xl font-bold text-white font-serif mb-5">Create a Clan</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Clan Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Knight's Gambit Clan"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this group about?"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Max Members</label>
              <input
                type="number"
                min={2}
                max={500}
                value={maxMembers}
                onChange={e => setMaxMembers(Math.max(2, Math.min(500, parseInt(e.target.value) || 20)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Visibility</label>
              <select
                value={isPublic ? 'public' : 'private'}
                onChange={e => setIsPublic(e.target.value === 'public')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={name.trim().length < 3}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors"
          >
            Create
          </button>
        </div>
      </motion.div>
    </div>
  );
}
