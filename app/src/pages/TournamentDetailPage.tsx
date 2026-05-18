import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PageShell from '../components/PageShell';
import {
  deleteTournament,
  getGameType,
  getStructure,
  getTournament,
  getUsername,
  isRegistered,
  listParticipants,
  registerForTournament,
  SEEDING_LABELS,
  STRUCTURE_LABELS,
  TOURNAMENT_STATUS_COLORS,
  unregisterFromTournament,
  updateTournamentStatus,
} from '../stores';
import type { TournamentStatus } from '../types';
import { cn, formatDate, tournamentRunningLabel } from '../utils';

export default function TournamentDetailPage() {
  const { tid } = useParams<{ tid: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const me = user?.uid ?? '';

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const r = () => setTick(t => t + 1);
    window.addEventListener('tournaments-updated', r);
    return () => window.removeEventListener('tournaments-updated', r);
  }, []);

  const tournament = useMemo(() => (tid ? getTournament(tid) : undefined), [tid, tick]);
  const structure = useMemo(() => (tournament ? getStructure(tournament.struct_id) : undefined), [tournament]);
  const gameType = useMemo(() => (tournament ? getGameType(tournament.game_type_id) : undefined), [tournament]);
  const participants = useMemo(() => (tid ? listParticipants(tid) : []), [tid, tick]);

  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flash = (kind: 'ok' | 'err', text: string) => {
    setFeedback({ kind, text });
    setTimeout(() => setFeedback(null), 2500);
  };

  if (!tournament) {
    return (
      <PageShell title="Tournament not found">
        <p className="text-slate-400">This tournament doesn't exist or has been deleted.</p>
        <Link to="/tournaments" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-semibold">
          Back to tournaments
        </Link>
      </PageShell>
    );
  }

  const registered = isRegistered(tournament.tid, me);
  const isOrganizer = tournament.organizer_pid === me;
  const isFull = participants.length >= tournament.max_participants;

  const handleRegister = () => {
    const r = registerForTournament(tournament.tid, me);
    flash(r.ok ? 'ok' : 'err', r.ok ? 'You are registered.' : (r.reason ?? 'Could not register.'));
  };

  const handleUnregister = () => {
    unregisterFromTournament(tournament.tid, me);
    flash('ok', 'Registration cancelled.');
  };

  const handleDelete = () => {
    if (!confirm(`Cancel "${tournament.name}"? All registrations will be discarded.`)) return;
    deleteTournament(tournament.tid);
    navigate('/tournaments');
  };

  const setStatus = (s: TournamentStatus) => updateTournamentStatus(tournament.tid, s);

  return (
    <PageShell
      title={tournament.name}
      subtitle={`${participants.length} / ${tournament.max_participants} registered · ${tournamentRunningLabel(tournament.status, tournament.scheduled_at)} · ${formatDate(tournament.scheduled_at)}`}
      actions={
        <>
          <span className={cn('px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider', TOURNAMENT_STATUS_COLORS[tournament.status])}>
            {tournament.status}
          </span>
          {!isOrganizer && tournament.status === 'scheduled' && (
            registered ? (
              <button
                onClick={handleUnregister}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold"
              >
                Withdraw
              </button>
            ) : (
              <button
                onClick={handleRegister}
                disabled={isFull}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-semibold"
              >
                {isFull ? 'Full' : 'Register'}
              </button>
            )
          )}
          {isOrganizer && (
            <>
              {tournament.status === 'scheduled' && (
                <button onClick={() => setStatus('active')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                  Start
                </button>
              )}
              {tournament.status === 'active' && (
                <button onClick={() => setStatus('completed')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
                  Mark Completed
                </button>
              )}
              {tournament.status !== 'completed' && (
                <button onClick={handleDelete} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm font-semibold">
                  Cancel Event
                </button>
              )}
            </>
          )}
        </>
      }
    >
      {feedback && (
        <div className={cn(
          'mb-4 p-3 rounded-lg border text-sm',
          feedback.kind === 'ok'
            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
            : 'bg-red-500/15 text-red-500 border-red-500/30',
        )}>
          {feedback.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 space-y-4">
          <Panel title="Tournament">
            <Stat label="Organizer" value={getUsername(tournament.organizer_pid)} />
            <Stat label="Reward" value={tournament.reward || '—'} />
            <Stat label="Elo entry" value={`${tournament.entry_elo_min}–${tournament.entry_elo_max}`} />
            <Stat label="Capacity" value={`${participants.length} / ${tournament.max_participants}`} />
            <Stat label="Created" value={formatDate(tournament.created_at)} />
          </Panel>

          <Panel title="Format (Structure)">
            {structure ? (
              <>
                <Stat label="Type" value={STRUCTURE_LABELS[structure.format_type]} />
                <Stat label="Rounds" value={String(structure.rounds)} />
                <Stat label="Seeding" value={SEEDING_LABELS[structure.seeding_method]} />
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">{structure.details}</p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Structure not found.</p>
            )}
          </Panel>

          <Panel title="Game Type">
            {gameType ? (
              <>
                <Stat label="Name" value={gameType.type_name} />
                <Stat label="Board" value={gameType.board_size} />
                <Stat label="Time limit" value={`${Math.round(gameType.max_duration_sec / 60)} min`} />
                <Stat label="Ranked" value={gameType.is_ranked ? 'Yes' : 'No'} />
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">{gameType.description}</p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Game type not found.</p>
            )}
          </Panel>
        </section>

        <section className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Participants</h2>
              <span className="text-sm text-slate-400 font-mono">{participants.length}</span>
            </div>
            {participants.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No one has registered yet. Be the first to enter!
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 w-16">Seed</th>
                    <th className="px-6 py-3">Player</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Enrolled</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {participants.map(p => (
                    <tr key={p.pid} className="hover:bg-slate-700/30">
                      <td className="px-6 py-3 font-mono text-sm text-slate-400">#{p.seed ?? '—'}</td>
                      <td className="px-6 py-3">
                        <Link to={`/profile/${p.pid}`} className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {getUsername(p.pid)[0].toUpperCase()}
                          </span>
                          <span className="text-sm text-white truncate">{getUsername(p.pid)}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500 font-mono hidden sm:table-cell">{formatDate(p.enrolled_at)}</td>
                      <td className="px-6 py-3 text-right">
                        {p.final_rank !== null ? (
                          <span className="text-xs text-amber-500 font-semibold">Finished #{p.final_rank}</span>
                        ) : p.eliminated ? (
                          <span className="text-xs text-red-500 font-semibold">Eliminated</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</h2>
      <dl className="space-y-1.5 text-xs">{children}</dl>
    </div>
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
