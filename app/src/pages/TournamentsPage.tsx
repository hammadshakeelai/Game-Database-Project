import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import PageShell from '../components/PageShell';
import {
  createTournament,
  getGameType,
  getStructure,
  listGameTypes,
  listParticipants,
  listStructures,
  listTournaments,
  STRUCTURE_LABELS,
  TOURNAMENT_STATUS_COLORS,
} from '../stores';
import type { Tournament, TournamentStatus } from '../types';
import { cn, formatDate } from '../utils';

const STATUS_FILTERS: ({ key: 'all' | TournamentStatus; label: string })[] = [
  { key: 'all',       label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export default function TournamentsPage() {
  const { user } = useAuth();
  const me = user?.uid ?? '';

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const r = () => setTick(t => t + 1);
    window.addEventListener('tournaments-updated', r);
    return () => window.removeEventListener('tournaments-updated', r);
  }, []);

  const tournaments = useMemo(() => listTournaments(), [tick]);
  const [filter, setFilter] = useState<'all' | TournamentStatus>('all');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = filter === 'all' ? tournaments : tournaments.filter(t => t.status === filter);

  return (
    <PageShell
      title="Tournaments"
      subtitle="Brackets, leagues, ladders. Browse open events or host your own."
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-500/20"
        >
          Host Tournament
        </button>
      }
    >
      <div className="flex flex-wrap gap-1 mb-5 p-1 bg-slate-800 rounded-lg border border-slate-700 w-fit">
        {STATUS_FILTERS.map(f => (
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
          No tournaments match this filter. Host one to get the bracket rolling.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            // @ts-expect-error React key prop
            <TournamentCard key={t.tid} t={t} me={me} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTournamentModal organizerPid={me} onClose={() => setShowCreate(false)} />
      )}
    </PageShell>
  );
}

function TournamentCard({ t, me }: { t: Tournament; me: string }) {
  const structure = getStructure(t.struct_id);
  const gameType = getGameType(t.game_type_id);
  const filled = listParticipants(t.tid).length;
  const isFull = filled >= t.max_participants;
  const isRegistered = listParticipants(t.tid).some(p => p.pid === me);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-indigo-500/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/tournaments/${t.tid}`} className="text-base font-bold text-white hover:text-indigo-600 truncate flex-1">
          {t.name}
        </Link>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider', TOURNAMENT_STATUS_COLORS[t.status])}>
          {t.status}
        </span>
      </div>

      {t.reward && (
        <p className="text-xs text-amber-500 font-semibold">Prize: {t.reward}</p>
      )}

      <dl className="text-xs text-slate-400 space-y-1.5">
        <Row label="Format" value={structure ? STRUCTURE_LABELS[structure.format_type] : '—'} />
        <Row label="Game" value={gameType?.type_name ?? '—'} />
        <Row label="Field" value={`${filled} / ${t.max_participants}`} />
        <Row label="Elo" value={`${t.entry_elo_min}–${t.entry_elo_max}`} />
        <Row label="Starts" value={formatDate(t.scheduled_at)} />
      </dl>

      <div className="mt-auto pt-2 flex gap-2">
        <Link
          to={`/tournaments/${t.tid}`}
          className="flex-1 text-center py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Open
        </Link>
        {!isRegistered && t.status === 'scheduled' && !isFull && (
          <Link
            to={`/tournaments/${t.tid}`}
            className="flex-1 text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Register
          </Link>
        )}
        {isRegistered && (
          <span className="flex-1 text-center py-2 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 rounded-lg text-xs font-semibold">
            Registered
          </span>
        )}
        {isFull && !isRegistered && (
          <span className="flex-1 text-center py-2 bg-slate-700/40 text-slate-500 rounded-lg text-xs font-semibold">
            Full
          </span>
        )}
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-300 font-medium text-right truncate">{value}</dd>
    </div>
  );
}

function CreateTournamentModal({ organizerPid, onClose }: { organizerPid: string; onClose: () => void }) {
  const structures = useMemo(() => listStructures(), []);
  const gameTypes = useMemo(() => listGameTypes(), []);

  const [name, setName] = useState('');
  const [structId, setStructId] = useState(structures[0]?.struct_id ?? '');
  const [gtId, setGtId] = useState(gameTypes[0]?.gt_id ?? '');
  const [reward, setReward] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [eloMin, setEloMin] = useState(0);
  const [eloMax, setEloMax] = useState(5000);
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });

  const submit = () => {
    if (name.trim().length < 3 || !structId || !gtId) return;
    createTournament({
      name: name.trim(),
      struct_id: structId,
      game_type_id: gtId,
      organizer_pid: organizerPid,
      reward: reward.trim(),
      scheduled_at: new Date(scheduledAt).getTime(),
      max_participants: maxParticipants,
      entry_elo_min: eloMin,
      entry_elo_max: eloMax,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-auto"
      >
        <h3 className="text-2xl font-bold text-white font-serif mb-5">Host a Tournament</h3>

        <div className="space-y-4">
          <Field label="Tournament Name">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spring Invitational"
              maxLength={150}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Format">
              <select
                value={structId}
                onChange={e => setStructId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {structures.map(s => (
                  <option key={s.struct_id} value={s.struct_id}>
                    {STRUCTURE_LABELS[s.format_type]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Game Type">
              <select
                value={gtId}
                onChange={e => setGtId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {gameTypes.map(g => (
                  <option key={g.gt_id} value={g.gt_id}>
                    {g.type_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Prize / Reward (optional)">
            <input
              value={reward}
              onChange={e => setReward(e.target.value)}
              placeholder="e.g. 500 Elo bonus, custom title"
              maxLength={150}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Scheduled Start">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </Field>
            <Field label="Max Participants">
              <input
                type="number"
                min={2}
                max={128}
                value={maxParticipants}
                onChange={e => setMaxParticipants(Math.max(2, Math.min(128, parseInt(e.target.value) || 8)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Elo">
              <input
                type="number"
                min={0}
                max={5000}
                value={eloMin}
                onChange={e => setEloMin(Math.max(0, Math.min(5000, parseInt(e.target.value) || 0)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </Field>
            <Field label="Max Elo">
              <input
                type="number"
                min={0}
                max={5000}
                value={eloMax}
                onChange={e => setEloMax(Math.max(0, Math.min(5000, parseInt(e.target.value) || 5000)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={name.trim().length < 3 || !structId || !gtId || eloMin > eloMax}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold"
          >
            Create
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
