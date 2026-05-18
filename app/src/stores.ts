/**
 * Local data stores for ERD entities.
 *
 * Each store mirrors a SQL table from milestone4_ddl.sql, persisted to
 * localStorage. CRUD helpers expose the same operations the SQL DML
 * scripts perform, so the React app exercises every entity from the
 * normalized schema.
 */

import type {
  Friend,
  FriendStatus,
  GameType,
  Group,
  GroupMember,
  GroupRole,
  Notification,
  NotificationType,
  Participant,
  SeedingMethod,
  Structure,
  StructureFormat,
  Tournament,
  TournamentStatus,
  UserProfile,
} from './types';

// ────────────────────────────────────────────────────────────
// Storage keys
// ────────────────────────────────────────────────────────────

const KEY_GAMETYPES   = 'sttt_gametypes';
const KEY_STRUCTURES  = 'sttt_structures';
const KEY_TOURNAMENTS = 'sttt_tournaments';
const KEY_PARTICIPANTS = 'sttt_participants';
const KEY_FRIENDS     = 'sttt_friends';
const KEY_GROUPS      = 'sttt_groups';
const KEY_GROUP_LIST  = 'sttt_group_list';
const KEY_NOTIFS      = 'sttt_notifications';
const KEY_USERS       = 'sttt_users';
const SEED_FLAG       = 'sttt_seeded_m7';

// ────────────────────────────────────────────────────────────
// Generic helpers
// ────────────────────────────────────────────────────────────

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function notify(eventName: string): void {
  window.dispatchEvent(new Event(eventName));
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ────────────────────────────────────────────────────────────
// User directory — bridges to existing sttt_users blob
// ────────────────────────────────────────────────────────────

interface StoredUserBlob {
  uid: string;
  email: string;
  passwordHash: string;
  profile: UserProfile | null;
}

export function listAllUsers(): { uid: string; profile: UserProfile | null; email: string }[] {
  const blob = readArray<StoredUserBlob>(KEY_USERS);
  return blob.map(u => ({ uid: u.uid, profile: u.profile, email: u.email }));
}

export function getUserProfile(uid: string): UserProfile | null {
  return listAllUsers().find(u => u.uid === uid)?.profile ?? null;
}

export function getUsername(uid: string): string {
  return getUserProfile(uid)?.username ?? uid.slice(0, 8);
}

// ────────────────────────────────────────────────────────────
// GAMETYPE
// ────────────────────────────────────────────────────────────

export function listGameTypes(): GameType[] {
  return readArray<GameType>(KEY_GAMETYPES);
}

export function getGameType(gt_id: string): GameType | undefined {
  return listGameTypes().find(g => g.gt_id === gt_id);
}

export function createGameType(input: Omit<GameType, 'gt_id' | 'created_at'>): GameType {
  const gt: GameType = { ...input, gt_id: newId('gt'), created_at: Date.now() };
  const all = listGameTypes();
  all.push(gt);
  writeArray(KEY_GAMETYPES, all);
  notify('gametypes-updated');
  return gt;
}

// ────────────────────────────────────────────────────────────
// STRUCTURE
// ────────────────────────────────────────────────────────────

export function listStructures(): Structure[] {
  return readArray<Structure>(KEY_STRUCTURES);
}

export function getStructure(struct_id: string): Structure | undefined {
  return listStructures().find(s => s.struct_id === struct_id);
}

export function createStructure(input: Omit<Structure, 'struct_id'>): Structure {
  const s: Structure = { ...input, struct_id: newId('st') };
  const all = listStructures();
  all.push(s);
  writeArray(KEY_STRUCTURES, all);
  return s;
}

// ────────────────────────────────────────────────────────────
// TOURNAMENT + PARTICIPANT
// ────────────────────────────────────────────────────────────

export function listTournaments(): Tournament[] {
  return readArray<Tournament>(KEY_TOURNAMENTS).sort((a, b) => b.scheduled_at - a.scheduled_at);
}

export function getTournament(tid: string): Tournament | undefined {
  return listTournaments().find(t => t.tid === tid);
}

export function createTournament(input: Omit<Tournament, 'tid' | 'created_at' | 'status'>): Tournament {
  const t: Tournament = {
    ...input,
    tid: newId('tn'),
    status: 'scheduled',
    created_at: Date.now(),
  };
  const all = readArray<Tournament>(KEY_TOURNAMENTS);
  all.push(t);
  writeArray(KEY_TOURNAMENTS, all);
  notify('tournaments-updated');
  return t;
}

export function updateTournamentStatus(tid: string, status: TournamentStatus): void {
  const all = readArray<Tournament>(KEY_TOURNAMENTS);
  const idx = all.findIndex(t => t.tid === tid);
  if (idx === -1) return;
  all[idx] = { ...all[idx], status };
  writeArray(KEY_TOURNAMENTS, all);
  notify('tournaments-updated');
}

export function deleteTournament(tid: string): void {
  writeArray(KEY_TOURNAMENTS, readArray<Tournament>(KEY_TOURNAMENTS).filter(t => t.tid !== tid));
  writeArray(KEY_PARTICIPANTS, readArray<Participant>(KEY_PARTICIPANTS).filter(p => p.tid !== tid));
  notify('tournaments-updated');
}

export function listParticipants(tid: string): Participant[] {
  return readArray<Participant>(KEY_PARTICIPANTS)
    .filter(p => p.tid === tid)
    .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
}

export function listTournamentsForPlayer(pid: string): Tournament[] {
  const myTids = new Set(readArray<Participant>(KEY_PARTICIPANTS).filter(p => p.pid === pid).map(p => p.tid));
  return listTournaments().filter(t => myTids.has(t.tid) || t.organizer_pid === pid);
}

export function isRegistered(tid: string, pid: string): boolean {
  return listParticipants(tid).some(p => p.pid === pid);
}

export function registerForTournament(tid: string, pid: string): { ok: boolean; reason?: string } {
  if (isRegistered(tid, pid)) return { ok: false, reason: 'Already registered' };
  const t = getTournament(tid);
  if (!t) return { ok: false, reason: 'Tournament not found' };
  if (t.status !== 'scheduled') return { ok: false, reason: 'Registration closed' };
  const filled = listParticipants(tid).length;
  if (filled >= t.max_participants) return { ok: false, reason: 'Tournament is full' };

  const profile = getUserProfile(pid);
  if (profile && (profile.elo_rating < t.entry_elo_min || profile.elo_rating > t.entry_elo_max)) {
    return { ok: false, reason: `Your Elo (${profile.elo_rating}) is outside the entry range` };
  }

  const all = readArray<Participant>(KEY_PARTICIPANTS);
  all.push({
    tid,
    pid,
    seed: filled + 1,
    enrolled_at: Date.now(),
    eliminated: false,
    final_rank: null,
    prize_awarded: null,
  });
  writeArray(KEY_PARTICIPANTS, all);
  notify('tournaments-updated');
  return { ok: true };
}

export function unregisterFromTournament(tid: string, pid: string): void {
  writeArray(
    KEY_PARTICIPANTS,
    readArray<Participant>(KEY_PARTICIPANTS).filter(p => !(p.tid === tid && p.pid === pid)),
  );
  notify('tournaments-updated');
}

// ────────────────────────────────────────────────────────────
// FRIENDS
// ────────────────────────────────────────────────────────────

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function findFriendRow(a: string, b: string): Friend | undefined {
  const [p1, p2] = orderPair(a, b);
  return readArray<Friend>(KEY_FRIENDS).find(f => f.pid1 === p1 && f.pid2 === p2);
}

export function getFriendStatus(a: string, b: string): { status: FriendStatus; requested_by: string } | null {
  const row = findFriendRow(a, b);
  return row ? { status: row.status, requested_by: row.requested_by } : null;
}

export function listFriendsForUser(pid: string): { friend_pid: string; status: FriendStatus; since: number; requested_by: string }[] {
  const rows = readArray<Friend>(KEY_FRIENDS).filter(f => f.pid1 === pid || f.pid2 === pid);
  return rows.map(r => ({
    friend_pid: r.pid1 === pid ? r.pid2 : r.pid1,
    status: r.status,
    since: r.since,
    requested_by: r.requested_by,
  }));
}

export function listIncomingRequests(pid: string): { from_pid: string; since: number }[] {
  return listFriendsForUser(pid)
    .filter(f => f.status === 'pending' && f.requested_by !== pid)
    .map(f => ({ from_pid: f.friend_pid, since: f.since }));
}

export function listAcceptedFriends(pid: string): { friend_pid: string; since: number }[] {
  return listFriendsForUser(pid).filter(f => f.status === 'accepted');
}

export function sendFriendRequest(from: string, to: string): { ok: boolean; reason?: string } {
  if (from === to) return { ok: false, reason: "You can't friend yourself" };
  if (findFriendRow(from, to)) return { ok: false, reason: 'Already pending or already friends' };

  const [pid1, pid2] = orderPair(from, to);
  const all = readArray<Friend>(KEY_FRIENDS);
  all.push({ pid1, pid2, since: Date.now(), status: 'pending', requested_by: from });
  writeArray(KEY_FRIENDS, all);

  createNotification({
    recipient_pid: to,
    type: 'friend_request',
    ref_id: from,
    content: `${getUsername(from)} sent you a friend request.`,
  });
  notify('friends-updated');
  return { ok: true };
}

export function acceptFriendRequest(me: string, them: string): void {
  const [pid1, pid2] = orderPair(me, them);
  const all = readArray<Friend>(KEY_FRIENDS);
  const idx = all.findIndex(f => f.pid1 === pid1 && f.pid2 === pid2);
  if (idx === -1) return;
  all[idx] = { ...all[idx], status: 'accepted', since: Date.now() };
  writeArray(KEY_FRIENDS, all);

  createNotification({
    recipient_pid: them,
    type: 'friend_request',
    ref_id: me,
    content: `${getUsername(me)} accepted your friend request.`,
  });
  notify('friends-updated');
}

export function removeFriend(me: string, them: string): void {
  const [pid1, pid2] = orderPair(me, them);
  writeArray(KEY_FRIENDS, readArray<Friend>(KEY_FRIENDS).filter(f => !(f.pid1 === pid1 && f.pid2 === pid2)));
  notify('friends-updated');
}

// ────────────────────────────────────────────────────────────
// GROUPS
// ────────────────────────────────────────────────────────────

export function listGroups(): Group[] {
  return readArray<Group>(KEY_GROUPS).sort((a, b) => b.created_at - a.created_at);
}

export function getGroup(gid: string): Group | undefined {
  return listGroups().find(g => g.gid === gid);
}

export function createGroup(input: Omit<Group, 'gid' | 'created_at'>): Group {
  const g: Group = { ...input, gid: newId('gr'), created_at: Date.now() };
  const all = readArray<Group>(KEY_GROUPS);
  all.push(g);
  writeArray(KEY_GROUPS, all);

  const members = readArray<GroupMember>(KEY_GROUP_LIST);
  members.push({
    gid: g.gid,
    pid: g.owner_pid,
    role: 'owner',
    joined_at: Date.now(),
    invited_by: null,
  });
  writeArray(KEY_GROUP_LIST, members);
  notify('groups-updated');
  return g;
}

export function deleteGroup(gid: string): void {
  writeArray(KEY_GROUPS, readArray<Group>(KEY_GROUPS).filter(g => g.gid !== gid));
  writeArray(KEY_GROUP_LIST, readArray<GroupMember>(KEY_GROUP_LIST).filter(m => m.gid !== gid));
  notify('groups-updated');
}

export function listGroupMembers(gid: string): GroupMember[] {
  const roleOrder: Record<GroupRole, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };
  return readArray<GroupMember>(KEY_GROUP_LIST)
    .filter(m => m.gid === gid)
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.joined_at - b.joined_at);
}

export function listGroupsForPlayer(pid: string): Group[] {
  const myGids = new Set(readArray<GroupMember>(KEY_GROUP_LIST).filter(m => m.pid === pid).map(m => m.gid));
  return listGroups().filter(g => myGids.has(g.gid));
}

export function isGroupMember(gid: string, pid: string): boolean {
  return listGroupMembers(gid).some(m => m.pid === pid);
}

export function joinGroup(gid: string, pid: string, invited_by?: string | null): { ok: boolean; reason?: string } {
  if (isGroupMember(gid, pid)) return { ok: false, reason: 'Already a member' };
  const g = getGroup(gid);
  if (!g) return { ok: false, reason: 'Group not found' };
  if (listGroupMembers(gid).length >= g.max_members) return { ok: false, reason: 'Group is full' };

  const members = readArray<GroupMember>(KEY_GROUP_LIST);
  members.push({
    gid,
    pid,
    role: 'member',
    joined_at: Date.now(),
    invited_by: invited_by ?? null,
  });
  writeArray(KEY_GROUP_LIST, members);
  notify('groups-updated');
  return { ok: true };
}

export function leaveGroup(gid: string, pid: string): void {
  writeArray(
    KEY_GROUP_LIST,
    readArray<GroupMember>(KEY_GROUP_LIST).filter(m => !(m.gid === gid && m.pid === pid)),
  );
  notify('groups-updated');
}

export function changeGroupRole(gid: string, pid: string, role: GroupRole): void {
  const all = readArray<GroupMember>(KEY_GROUP_LIST);
  const idx = all.findIndex(m => m.gid === gid && m.pid === pid);
  if (idx === -1) return;
  all[idx] = { ...all[idx], role };
  writeArray(KEY_GROUP_LIST, all);
  notify('groups-updated');
}

export function inviteToGroup(gid: string, from_pid: string, to_pid: string): { ok: boolean; reason?: string } {
  if (isGroupMember(gid, to_pid)) return { ok: false, reason: 'Already a member' };
  const g = getGroup(gid);
  if (!g) return { ok: false, reason: 'Group not found' };

  createNotification({
    recipient_pid: to_pid,
    type: 'group_invite',
    ref_id: gid,
    content: `${getUsername(from_pid)} invited you to join "${g.group_name}".`,
  });
  return { ok: true };
}

// ────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ────────────────────────────────────────────────────────────

export function listNotifications(pid: string): Notification[] {
  return readArray<Notification>(KEY_NOTIFS)
    .filter(n => n.recipient_pid === pid)
    .sort((a, b) => b.created_at - a.created_at);
}

export function unreadCount(pid: string): number {
  return listNotifications(pid).filter(n => !n.is_read).length;
}

export function createNotification(input: Omit<Notification, 'nid' | 'is_read' | 'created_at'>): Notification {
  const n: Notification = {
    ...input,
    nid: newId('nt'),
    is_read: false,
    created_at: Date.now(),
  };
  const all = readArray<Notification>(KEY_NOTIFS);
  all.push(n);
  writeArray(KEY_NOTIFS, all);
  notify('notifications-updated');
  return n;
}

export function markNotificationRead(nid: string): void {
  const all = readArray<Notification>(KEY_NOTIFS);
  const idx = all.findIndex(n => n.nid === nid);
  if (idx === -1) return;
  all[idx] = { ...all[idx], is_read: true };
  writeArray(KEY_NOTIFS, all);
  notify('notifications-updated');
}

export function markAllNotificationsRead(pid: string): void {
  const all = readArray<Notification>(KEY_NOTIFS);
  const next = all.map(n => (n.recipient_pid === pid && !n.is_read ? { ...n, is_read: true } : n));
  writeArray(KEY_NOTIFS, next);
  notify('notifications-updated');
}

export function deleteNotification(nid: string): void {
  writeArray(KEY_NOTIFS, readArray<Notification>(KEY_NOTIFS).filter(n => n.nid !== nid));
  notify('notifications-updated');
}

// ────────────────────────────────────────────────────────────
// Seed defaults — runs once per browser
// ────────────────────────────────────────────────────────────

export function seedDefaults(): void {
  if (localStorage.getItem(SEED_FLAG)) return;

  // ── Milestone 5: GameTypes (50 rows from gametype.csv) ─────────────────────
  writeArray<GameType>(KEY_GAMETYPES, [
    { gt_id: 'GT001', type_name: 'Quoridor Blitz 1',          description: 'Blitz ruleset for Quoridor with balanced matchmaking.',         max_duration_sec: 1200, is_ranked: true,  board_size: '19x19',  created_at: Date.parse('2026-01-27T00:35:37Z') },
    { gt_id: 'GT002', type_name: 'Shogi Rapid 2',             description: 'Rapid ruleset for Shogi with balanced matchmaking.',            max_duration_sec:  900, is_ranked: false, board_size: '10x10',  created_at: Date.parse('2026-01-26T05:49:57Z') },
    { gt_id: 'GT003', type_name: 'Mancala Classic 3',         description: 'Classic ruleset for Mancala with balanced matchmaking.',        max_duration_sec:  900, is_ranked: false, board_size: '19x19',  created_at: Date.parse('2026-05-18T09:06:38Z') },
    { gt_id: 'GT004', type_name: 'Blokus Blitz 4',            description: 'Blitz ruleset for Blokus with balanced matchmaking.',           max_duration_sec: 1200, is_ranked: false, board_size: '10x10',  created_at: Date.parse('2025-04-28T22:15:35Z') },
    { gt_id: 'GT005', type_name: 'Hex Team 5',                description: 'Team ruleset for Hex with balanced matchmaking.',               max_duration_sec: 1200, is_ranked: false, board_size: '9x9',    created_at: Date.parse('2026-11-17T00:37:34Z') },
    { gt_id: 'GT006', type_name: 'Backgammon Team 6',         description: 'Team ruleset for Backgammon with balanced matchmaking.',        max_duration_sec:  600, is_ranked: false, board_size: '8x8',    created_at: Date.parse('2025-04-06T18:28:23Z') },
    { gt_id: 'GT007', type_name: 'Blokus Team 7',             description: 'Team ruleset for Blokus with balanced matchmaking.',            max_duration_sec: 1200, is_ranked: true,  board_size: '13x13',  created_at: Date.parse('2024-01-26T00:11:28Z') },
    { gt_id: 'GT008', type_name: 'Shogi Casual 8',            description: 'Casual ruleset for Shogi with balanced matchmaking.',           max_duration_sec:  300, is_ranked: false, board_size: '8x8',    created_at: Date.parse('2026-02-23T12:52:39Z') },
    { gt_id: 'GT009', type_name: 'Quoridor Classic 9',        description: 'Classic ruleset for Quoridor with balanced matchmaking.',       max_duration_sec: 3600, is_ranked: true,  board_size: '13x13',  created_at: Date.parse('2026-09-11T16:01:01Z') },
    { gt_id: 'GT010', type_name: 'Shogi Rapid 10',            description: 'Rapid ruleset for Shogi with balanced matchmaking.',            max_duration_sec: 1200, is_ranked: false, board_size: '10x10',  created_at: Date.parse('2026-07-24T16:47:40Z') },
    { gt_id: 'GT011', type_name: 'Tafl Rapid 11',             description: 'Rapid ruleset for Tafl with balanced matchmaking.',             max_duration_sec:  900, is_ranked: false, board_size: '10x10',  created_at: Date.parse('2026-07-30T04:46:01Z') },
    { gt_id: 'GT012', type_name: 'Blokus Classic 12',         description: 'Classic ruleset for Blokus with balanced matchmaking.',         max_duration_sec: 1800, is_ranked: true,  board_size: '9x9',    created_at: Date.parse('2026-08-05T23:23:17Z') },
    { gt_id: 'GT013', type_name: 'Stratego Arena 13',         description: 'Arena ruleset for Stratego with balanced matchmaking.',         max_duration_sec: 3600, is_ranked: true,  board_size: '13x13',  created_at: Date.parse('2024-04-30T10:13:32Z') },
    { gt_id: 'GT014', type_name: 'Reversi Solo 14',           description: 'Solo ruleset for Reversi with balanced matchmaking.',           max_duration_sec:  600, is_ranked: false, board_size: '8x8',    created_at: Date.parse('2024-02-08T22:40:03Z') },
    { gt_id: 'GT015', type_name: 'Hive Classic 15',           description: 'Classic ruleset for Hive with balanced matchmaking.',           max_duration_sec:  900, is_ranked: false, board_size: '10x10',  created_at: Date.parse('2025-09-28T13:10:02Z') },
    { gt_id: 'GT016', type_name: 'Shogi Arena 16',            description: 'Arena ruleset for Shogi with balanced matchmaking.',            max_duration_sec: 1800, is_ranked: false, board_size: '19x19',  created_at: Date.parse('2026-10-23T15:21:36Z') },
    { gt_id: 'GT017', type_name: 'Connect4 Blitz 17',         description: 'Blitz ruleset for Connect4 with balanced matchmaking.',         max_duration_sec:  600, is_ranked: true,  board_size: '19x19',  created_at: Date.parse('2025-07-15T18:17:06Z') },
    { gt_id: 'GT018', type_name: 'Risk Arena 18',             description: 'Arena ruleset for Risk with balanced matchmaking.',             max_duration_sec: 1200, is_ranked: true,  board_size: '9x9',    created_at: Date.parse('2025-11-14T20:54:53Z') },
    { gt_id: 'GT019', type_name: 'Mancala Solo 19',           description: 'Solo ruleset for Mancala with balanced matchmaking.',           max_duration_sec:  900, is_ranked: true,  board_size: '13x13',  created_at: Date.parse('2025-02-18T07:41:08Z') },
    { gt_id: 'GT020', type_name: 'Hex Blitz 20',              description: 'Blitz ruleset for Hex with balanced matchmaking.',              max_duration_sec:  300, is_ranked: false, board_size: '10x10',  created_at: Date.parse('2026-05-30T06:15:39Z') },
    { gt_id: 'GT021', type_name: 'Stratego Team 21',          description: 'Team ruleset for Stratego with balanced matchmaking.',          max_duration_sec: 3600, is_ranked: false, board_size: '13x13',  created_at: Date.parse('2025-03-12T19:54:44Z') },
    { gt_id: 'GT022', type_name: 'Dominoes Team 22',          description: 'Team ruleset for Dominoes with balanced matchmaking.',          max_duration_sec: 1200, is_ranked: true,  board_size: '9x9',    created_at: Date.parse('2025-07-13T22:17:29Z') },
    { gt_id: 'GT023', type_name: 'Pente Casual 23',           description: 'Casual ruleset for Pente with balanced matchmaking.',           max_duration_sec: 1800, is_ranked: false, board_size: 'custom', created_at: Date.parse('2025-03-02T03:00:01Z') },
    { gt_id: 'GT024', type_name: 'Chess Team 24',             description: 'Team ruleset for Chess with balanced matchmaking.',             max_duration_sec:  900, is_ranked: true,  board_size: '19x19',  created_at: Date.parse('2026-10-29T20:27:29Z') },
    { gt_id: 'GT025', type_name: 'Checkers Solo 25',          description: 'Solo ruleset for Checkers with balanced matchmaking.',          max_duration_sec:  900, is_ranked: true,  board_size: '19x19',  created_at: Date.parse('2025-05-29T19:28:38Z') },
    { gt_id: 'GT026', type_name: 'Backgammon Arena 26',       description: 'Arena ruleset for Backgammon with balanced matchmaking.',       max_duration_sec: 1800, is_ranked: false, board_size: 'custom', created_at: Date.parse('2026-09-18T12:04:08Z') },
    { gt_id: 'GT027', type_name: 'Shogi Rapid 27',            description: 'Rapid ruleset for Shogi with balanced matchmaking.',            max_duration_sec: 3600, is_ranked: true,  board_size: '10x10',  created_at: Date.parse('2025-10-14T07:04:47Z') },
    { gt_id: 'GT028', type_name: 'Checkers Casual 28',        description: 'Casual ruleset for Checkers with balanced matchmaking.',        max_duration_sec: 3600, is_ranked: true,  board_size: '8x8',    created_at: Date.parse('2025-03-01T22:30:54Z') },
    { gt_id: 'GT029', type_name: 'Hive Team 29',              description: 'Team ruleset for Hive with balanced matchmaking.',              max_duration_sec:  600, is_ranked: true,  board_size: '9x9',    created_at: Date.parse('2026-03-16T10:34:43Z') },
    { gt_id: 'GT030', type_name: 'Othello Ranked 30',         description: 'Ranked ruleset for Othello with balanced matchmaking.',         max_duration_sec:  600, is_ranked: false, board_size: '13x13',  created_at: Date.parse('2025-03-01T23:40:14Z') },
    { gt_id: 'GT031', type_name: 'Hive Rapid 31',             description: 'Rapid ruleset for Hive with balanced matchmaking.',             max_duration_sec: 1200, is_ranked: true,  board_size: '9x9',    created_at: Date.parse('2024-11-13T23:31:31Z') },
    { gt_id: 'GT032', type_name: 'Tafl Casual 32',            description: 'Casual ruleset for Tafl with balanced matchmaking.',            max_duration_sec:  300, is_ranked: false, board_size: '8x8',    created_at: Date.parse('2025-01-13T07:43:49Z') },
    { gt_id: 'GT033', type_name: 'Hex Rapid 33',              description: 'Rapid ruleset for Hex with balanced matchmaking.',              max_duration_sec: 1200, is_ranked: false, board_size: 'custom', created_at: Date.parse('2026-10-08T22:40:54Z') },
    { gt_id: 'GT034', type_name: 'Mancala Team 34',           description: 'Team ruleset for Mancala with balanced matchmaking.',           max_duration_sec: 3600, is_ranked: false, board_size: '8x8',    created_at: Date.parse('2026-10-12T19:43:49Z') },
    { gt_id: 'GT035', type_name: 'Backgammon Solo 35',        description: 'Solo ruleset for Backgammon with balanced matchmaking.',        max_duration_sec:  300, is_ranked: false, board_size: '19x19',  created_at: Date.parse('2024-11-07T09:10:02Z') },
    { gt_id: 'GT036', type_name: 'Go Solo 36',                description: 'Solo ruleset for Go with balanced matchmaking.',               max_duration_sec: 3600, is_ranked: false, board_size: 'custom', created_at: Date.parse('2025-08-24T18:22:22Z') },
    { gt_id: 'GT037', type_name: 'Reversi Blitz 37',          description: 'Blitz ruleset for Reversi with balanced matchmaking.',          max_duration_sec:  300, is_ranked: true,  board_size: '10x10',  created_at: Date.parse('2026-01-02T18:22:37Z') },
    { gt_id: 'GT038', type_name: 'Reversi Rapid 38',          description: 'Rapid ruleset for Reversi with balanced matchmaking.',          max_duration_sec:  600, is_ranked: true,  board_size: '13x13',  created_at: Date.parse('2025-11-03T05:03:54Z') },
    { gt_id: 'GT039', type_name: 'Othello Team 39',           description: 'Team ruleset for Othello with balanced matchmaking.',           max_duration_sec: 1800, is_ranked: true,  board_size: '13x13',  created_at: Date.parse('2026-09-11T21:15:29Z') },
    { gt_id: 'GT040', type_name: 'Reversi Solo 40',           description: 'Solo ruleset for Reversi with balanced matchmaking.',           max_duration_sec: 1800, is_ranked: false, board_size: '10x10',  created_at: Date.parse('2024-01-19T07:45:05Z') },
    { gt_id: 'GT041', type_name: 'Othello Arena 41',          description: 'Arena ruleset for Othello with balanced matchmaking.',          max_duration_sec: 1200, is_ranked: false, board_size: '9x9',    created_at: Date.parse('2025-06-14T21:54:56Z') },
    { gt_id: 'GT042', type_name: 'Reversi Casual 42',         description: 'Casual ruleset for Reversi with balanced matchmaking.',         max_duration_sec: 1800, is_ranked: false, board_size: '8x8',    created_at: Date.parse('2025-08-08T23:43:18Z') },
    { gt_id: 'GT043', type_name: 'Mancala Arena 43',          description: 'Arena ruleset for Mancala with balanced matchmaking.',          max_duration_sec:  300, is_ranked: false, board_size: '8x8',    created_at: Date.parse('2026-09-24T01:48:34Z') },
    { gt_id: 'GT044', type_name: 'Dominoes Classic 44',       description: 'Classic ruleset for Dominoes with balanced matchmaking.',       max_duration_sec:  300, is_ranked: false, board_size: '9x9',    created_at: Date.parse('2024-06-12T02:46:57Z') },
    { gt_id: 'GT045', type_name: 'Pente Arena 45',            description: 'Arena ruleset for Pente with balanced matchmaking.',            max_duration_sec:  300, is_ranked: true,  board_size: '19x19',  created_at: Date.parse('2024-10-29T23:14:59Z') },
    { gt_id: 'GT046', type_name: 'Backgammon Casual 46',      description: 'Casual ruleset for Backgammon with balanced matchmaking.',      max_duration_sec:  600, is_ranked: true,  board_size: '10x10',  created_at: Date.parse('2024-07-11T06:21:31Z') },
    { gt_id: 'GT047', type_name: 'Shogi Ranked 47',           description: 'Ranked ruleset for Shogi with balanced matchmaking.',           max_duration_sec:  600, is_ranked: true,  board_size: 'custom', created_at: Date.parse('2024-01-08T13:09:13Z') },
    { gt_id: 'GT048', type_name: 'Shogi Classic 48',          description: 'Classic ruleset for Shogi with balanced matchmaking.',          max_duration_sec:  900, is_ranked: true,  board_size: '19x19',  created_at: Date.parse('2025-04-15T11:04:30Z') },
    { gt_id: 'GT049', type_name: 'Chess Blitz 49',            description: 'Blitz ruleset for Chess with balanced matchmaking.',            max_duration_sec:  900, is_ranked: true,  board_size: '9x9',    created_at: Date.parse('2025-09-13T10:32:49Z') },
    { gt_id: 'GT050', type_name: 'LinesOfAction Rapid 50',    description: 'Rapid ruleset for LinesOfAction with balanced matchmaking.',   max_duration_sec: 3600, is_ranked: true,  board_size: '13x13',  created_at: Date.parse('2025-10-25T20:54:40Z') },
  ]);

  // ── Milestone 5: Structures (50 rows from structure.csv) ───────────────────
  writeArray<Structure>(KEY_STRUCTURES, [
    { struct_id: 'S001', format_type: 'round_robin',        details: 'Round Robin tournament with 11 rounds.',         rounds: 11, seeding_method: 'balanced'  },
    { struct_id: 'S002', format_type: 'single_elimination', details: 'Single Elimination tournament with 10 rounds.',  rounds: 10, seeding_method: 'balanced'  },
    { struct_id: 'S003', format_type: 'double_elimination', details: 'Double Elimination tournament with 12 rounds.',  rounds: 12, seeding_method: 'random'    },
    { struct_id: 'S004', format_type: 'ladder',             details: 'Ladder tournament with 11 rounds.',              rounds: 11, seeding_method: 'manual'    },
    { struct_id: 'S005', format_type: 'swiss',              details: 'Swiss tournament with 3 rounds.',                rounds:  3, seeding_method: 'random'    },
    { struct_id: 'S006', format_type: 'swiss',              details: 'Swiss tournament with 9 rounds.',                rounds:  9, seeding_method: 'regional'  },
    { struct_id: 'S007', format_type: 'ladder',             details: 'Ladder tournament with 4 rounds.',               rounds:  4, seeding_method: 'regional'  },
    { struct_id: 'S008', format_type: 'ladder',             details: 'Ladder tournament with 10 rounds.',              rounds: 10, seeding_method: 'random'    },
    { struct_id: 'S009', format_type: 'single_elimination', details: 'Single Elimination tournament with 8 rounds.',   rounds:  8, seeding_method: 'balanced'  },
    { struct_id: 'S010', format_type: 'double_elimination', details: 'Double Elimination tournament with 4 rounds.',   rounds:  4, seeding_method: 'elo_based' },
    { struct_id: 'S011', format_type: 'round_robin',        details: 'Round Robin tournament with 12 rounds.',         rounds: 12, seeding_method: 'balanced'  },
    { struct_id: 'S012', format_type: 'league',             details: 'League tournament with 8 rounds.',               rounds:  8, seeding_method: 'regional'  },
    { struct_id: 'S013', format_type: 'league',             details: 'League tournament with 11 rounds.',              rounds: 11, seeding_method: 'manual'    },
    { struct_id: 'S014', format_type: 'swiss',              details: 'Swiss tournament with 11 rounds.',               rounds: 11, seeding_method: 'balanced'  },
    { struct_id: 'S015', format_type: 'swiss',              details: 'Swiss tournament with 4 rounds.',                rounds:  4, seeding_method: 'random'    },
    { struct_id: 'S016', format_type: 'ladder',             details: 'Ladder tournament with 11 rounds.',              rounds: 11, seeding_method: 'elo_based' },
    { struct_id: 'S017', format_type: 'swiss',              details: 'Swiss tournament with 10 rounds.',               rounds: 10, seeding_method: 'elo_based' },
    { struct_id: 'S018', format_type: 'swiss',              details: 'Swiss tournament with 8 rounds.',                rounds:  8, seeding_method: 'regional'  },
    { struct_id: 'S019', format_type: 'swiss',              details: 'Swiss tournament with 9 rounds.',                rounds:  9, seeding_method: 'random'    },
    { struct_id: 'S020', format_type: 'round_robin',        details: 'Round Robin tournament with 9 rounds.',          rounds:  9, seeding_method: 'manual'    },
    { struct_id: 'S021', format_type: 'ladder',             details: 'Ladder tournament with 7 rounds.',               rounds:  7, seeding_method: 'manual'    },
    { struct_id: 'S022', format_type: 'double_elimination', details: 'Double Elimination tournament with 10 rounds.',  rounds: 10, seeding_method: 'random'    },
    { struct_id: 'S023', format_type: 'single_elimination', details: 'Single Elimination tournament with 4 rounds.',   rounds:  4, seeding_method: 'random'    },
    { struct_id: 'S024', format_type: 'swiss',              details: 'Swiss tournament with 4 rounds.',                rounds:  4, seeding_method: 'manual'    },
    { struct_id: 'S025', format_type: 'double_elimination', details: 'Double Elimination tournament with 11 rounds.',  rounds: 11, seeding_method: 'random'    },
    { struct_id: 'S026', format_type: 'league',             details: 'League tournament with 11 rounds.',              rounds: 11, seeding_method: 'balanced'  },
    { struct_id: 'S027', format_type: 'round_robin',        details: 'Round Robin tournament with 4 rounds.',          rounds:  4, seeding_method: 'regional'  },
    { struct_id: 'S028', format_type: 'round_robin',        details: 'Round Robin tournament with 9 rounds.',          rounds:  9, seeding_method: 'random'    },
    { struct_id: 'S029', format_type: 'round_robin',        details: 'Round Robin tournament with 12 rounds.',         rounds: 12, seeding_method: 'manual'    },
    { struct_id: 'S030', format_type: 'round_robin',        details: 'Round Robin tournament with 4 rounds.',          rounds:  4, seeding_method: 'balanced'  },
    { struct_id: 'S031', format_type: 'league',             details: 'League tournament with 6 rounds.',               rounds:  6, seeding_method: 'elo_based' },
    { struct_id: 'S032', format_type: 'ladder',             details: 'Ladder tournament with 10 rounds.',              rounds: 10, seeding_method: 'elo_based' },
    { struct_id: 'S033', format_type: 'single_elimination', details: 'Single Elimination tournament with 8 rounds.',   rounds:  8, seeding_method: 'balanced'  },
    { struct_id: 'S034', format_type: 'round_robin',        details: 'Round Robin tournament with 4 rounds.',          rounds:  4, seeding_method: 'manual'    },
    { struct_id: 'S035', format_type: 'league',             details: 'League tournament with 6 rounds.',               rounds:  6, seeding_method: 'regional'  },
    { struct_id: 'S036', format_type: 'league',             details: 'League tournament with 12 rounds.',              rounds: 12, seeding_method: 'balanced'  },
    { struct_id: 'S037', format_type: 'ladder',             details: 'Ladder tournament with 11 rounds.',              rounds: 11, seeding_method: 'random'    },
    { struct_id: 'S038', format_type: 'league',             details: 'League tournament with 7 rounds.',               rounds:  7, seeding_method: 'random'    },
    { struct_id: 'S039', format_type: 'double_elimination', details: 'Double Elimination tournament with 7 rounds.',   rounds:  7, seeding_method: 'manual'    },
    { struct_id: 'S040', format_type: 'round_robin',        details: 'Round Robin tournament with 8 rounds.',          rounds:  8, seeding_method: 'random'    },
    { struct_id: 'S041', format_type: 'double_elimination', details: 'Double Elimination tournament with 5 rounds.',   rounds:  5, seeding_method: 'balanced'  },
    { struct_id: 'S042', format_type: 'ladder',             details: 'Ladder tournament with 9 rounds.',               rounds:  9, seeding_method: 'random'    },
    { struct_id: 'S043', format_type: 'double_elimination', details: 'Double Elimination tournament with 3 rounds.',   rounds:  3, seeding_method: 'random'    },
    { struct_id: 'S044', format_type: 'ladder',             details: 'Ladder tournament with 11 rounds.',              rounds: 11, seeding_method: 'elo_based' },
    { struct_id: 'S045', format_type: 'swiss',              details: 'Swiss tournament with 9 rounds.',                rounds:  9, seeding_method: 'regional'  },
    { struct_id: 'S046', format_type: 'round_robin',        details: 'Round Robin tournament with 5 rounds.',          rounds:  5, seeding_method: 'manual'    },
    { struct_id: 'S047', format_type: 'round_robin',        details: 'Round Robin tournament with 8 rounds.',          rounds:  8, seeding_method: 'balanced'  },
    { struct_id: 'S048', format_type: 'league',             details: 'League tournament with 4 rounds.',               rounds:  4, seeding_method: 'random'    },
    { struct_id: 'S049', format_type: 'double_elimination', details: 'Double Elimination tournament with 5 rounds.',   rounds:  5, seeding_method: 'balanced'  },
    { struct_id: 'S050', format_type: 'single_elimination', details: 'Single Elimination tournament with 4 rounds.',   rounds:  4, seeding_method: 'manual'    },
  ]);

  // ── Milestone 5: Demo players (P001-P025 from player.csv) ──────────────────
  // Injected into the user directory so organiser / owner names display correctly.
  const existingUsers = readArray<StoredUserBlob>(KEY_USERS);
  const knownUids = new Set(existingUsers.map(u => u.uid));
  const demoPlayers: StoredUserBlob[] = [
    { uid: 'P001', email: 'ava.khan1@example.com',           passwordHash: 'demo', profile: { username: 'Ava Khan',           email: 'ava.khan1@example.com',           elo_rating: 2185, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2026-01-13T11:30:11Z') } },
    { uid: 'P002', email: 'layla.lewis2@example.com',        passwordHash: 'demo', profile: { username: 'Layla Lewis',        email: 'layla.lewis2@example.com',        elo_rating:  854, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-07-11T04:28:19Z') } },
    { uid: 'P003', email: 'henry.lewis3@example.com',        passwordHash: 'demo', profile: { username: 'Henry Lewis',        email: 'henry.lewis3@example.com',        elo_rating: 2354, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-12-04T17:18:39Z') } },
    { uid: 'P004', email: 'ella.wilson4@example.com',        passwordHash: 'demo', profile: { username: 'Ella Wilson',        email: 'ella.wilson4@example.com',        elo_rating: 1535, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-10-15T06:20:52Z') } },
    { uid: 'P005', email: 'liam.adams5@example.com',         passwordHash: 'demo', profile: { username: 'Liam Adams',         email: 'liam.adams5@example.com',         elo_rating: 1930, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-06-08T08:18:01Z') } },
    { uid: 'P006', email: 'alexander.miller6@example.com',   passwordHash: 'demo', profile: { username: 'Alexander Miller',   email: 'alexander.miller6@example.com',   elo_rating:  963, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-12-15T18:10:15Z') } },
    { uid: 'P007', email: 'sebastian.wilson7@example.com',   passwordHash: 'demo', profile: { username: 'Sebastian Wilson',   email: 'sebastian.wilson7@example.com',   elo_rating: 2172, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-06-03T16:10:50Z') } },
    { uid: 'P008', email: 'william.scott8@example.com',      passwordHash: 'demo', profile: { username: 'William Scott',      email: 'william.scott8@example.com',      elo_rating: 1352, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-10-27T10:15:20Z') } },
    { uid: 'P009', email: 'aiden.mitchell9@example.com',     passwordHash: 'demo', profile: { username: 'Aiden Mitchell',     email: 'aiden.mitchell9@example.com',     elo_rating: 1621, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2026-02-03T06:24:11Z') } },
    { uid: 'P010', email: 'amelia.turner10@example.com',     passwordHash: 'demo', profile: { username: 'Amelia Turner',      email: 'amelia.turner10@example.com',     elo_rating: 2116, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-08-31T01:00:08Z') } },
    { uid: 'P011', email: 'ethan.lee11@example.com',         passwordHash: 'demo', profile: { username: 'Ethan Lee',          email: 'ethan.lee11@example.com',         elo_rating: 1995, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-12-25T01:28:11Z') } },
    { uid: 'P012', email: 'mason.lee12@example.com',         passwordHash: 'demo', profile: { username: 'Mason Lee',          email: 'mason.lee12@example.com',         elo_rating: 1113, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-07-17T06:15:30Z') } },
    { uid: 'P013', email: 'william.smith13@example.com',     passwordHash: 'demo', profile: { username: 'William Smith',      email: 'william.smith13@example.com',     elo_rating: 1933, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-04-11T08:34:57Z') } },
    { uid: 'P014', email: 'henry.nelson14@example.com',      passwordHash: 'demo', profile: { username: 'Henry Nelson',       email: 'henry.nelson14@example.com',      elo_rating:  806, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-01-09T17:58:55Z') } },
    { uid: 'P015', email: 'daniel.turner15@example.com',     passwordHash: 'demo', profile: { username: 'Daniel Turner',      email: 'daniel.turner15@example.com',     elo_rating: 1207, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-09-07T03:38:29Z') } },
    { uid: 'P016', email: 'james.young16@example.com',       passwordHash: 'demo', profile: { username: 'James Young',        email: 'james.young16@example.com',       elo_rating: 1029, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2026-02-11T06:38:58Z') } },
    { uid: 'P017', email: 'harper.patel17@example.com',      passwordHash: 'demo', profile: { username: 'Harper Patel',       email: 'harper.patel17@example.com',      elo_rating:  941, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-12-20T14:10:18Z') } },
    { uid: 'P018', email: 'elijah.green18@example.com',      passwordHash: 'demo', profile: { username: 'Elijah Green',       email: 'elijah.green18@example.com',      elo_rating: 1666, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-06-20T15:54:20Z') } },
    { uid: 'P019', email: 'abigail.clark19@example.com',     passwordHash: 'demo', profile: { username: 'Abigail Clark',      email: 'abigail.clark19@example.com',     elo_rating: 1307, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-11-20T05:09:08Z') } },
    { uid: 'P020', email: 'ella.khan20@example.com',         passwordHash: 'demo', profile: { username: 'Ella Khan',          email: 'ella.khan20@example.com',         elo_rating: 2249, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-09-16T10:52:09Z') } },
    { uid: 'P021', email: 'noah.roberts21@example.com',      passwordHash: 'demo', profile: { username: 'Noah Roberts',       email: 'noah.roberts21@example.com',      elo_rating: 1794, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-07-10T21:34:47Z') } },
    { uid: 'P022', email: 'alexander.king22@example.com',    passwordHash: 'demo', profile: { username: 'Alexander King',     email: 'alexander.king22@example.com',    elo_rating:  998, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-06-18T15:13:35Z') } },
    { uid: 'P023', email: 'chloe.lewis23@example.com',       passwordHash: 'demo', profile: { username: 'Chloe Lewis',        email: 'chloe.lewis23@example.com',       elo_rating:  924, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-06-14T05:58:14Z') } },
    { uid: 'P024', email: 'oliver.davis24@example.com',      passwordHash: 'demo', profile: { username: 'Oliver Davis',       email: 'oliver.davis24@example.com',      elo_rating: 1370, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-11-12T07:29:52Z') } },
    { uid: 'P025', email: 'noah.walker25@example.com',       passwordHash: 'demo', profile: { username: 'Noah Walker',        email: 'noah.walker25@example.com',       elo_rating:  830, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2026-03-06T02:37:34Z') } },
    { uid: 'P026', email: 'james.lewis26@example.com',       passwordHash: 'demo', profile: { username: 'James Lewis',        email: 'james.lewis26@example.com',       elo_rating: 1137, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-06-28T17:00:24Z') } },
    { uid: 'P027', email: 'sebastian.wilson27@example.com',  passwordHash: 'demo', profile: { username: 'Sebastian Wilson',   email: 'sebastian.wilson27@example.com',  elo_rating: 1938, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2026-02-15T12:08:07Z') } },
    { uid: 'P028', email: 'lucas.ahmed28@example.com',       passwordHash: 'demo', profile: { username: 'Lucas Ahmed',        email: 'lucas.ahmed28@example.com',       elo_rating: 1442, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-12-02T14:14:19Z') } },
    { uid: 'P029', email: 'layla.hall29@example.com',        passwordHash: 'demo', profile: { username: 'Layla Hall',         email: 'layla.hall29@example.com',        elo_rating: 1180, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-07-12T01:48:37Z') } },
    { uid: 'P030', email: 'harper.clark30@example.com',      passwordHash: 'demo', profile: { username: 'Harper Clark',       email: 'harper.clark30@example.com',      elo_rating:  967, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-09-17T14:50:54Z') } },
    { uid: 'P031', email: 'ethan.miller31@example.com',      passwordHash: 'demo', profile: { username: 'Ethan Miller',       email: 'ethan.miller31@example.com',      elo_rating: 2121, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-11-18T16:35:49Z') } },
    { uid: 'P033', email: 'daniel.wilson33@example.com',     passwordHash: 'demo', profile: { username: 'Daniel Wilson',      email: 'daniel.wilson33@example.com',     elo_rating: 1123, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-09-27T09:10:09Z') } },
    { uid: 'P034', email: 'hannah.carter34@example.com',     passwordHash: 'demo', profile: { username: 'Hannah Carter',      email: 'hannah.carter34@example.com',     elo_rating: 2158, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-11-06T11:00:07Z') } },
    { uid: 'P037', email: 'evelyn.patel37@example.com',      passwordHash: 'demo', profile: { username: 'Evelyn Patel',       email: 'evelyn.patel37@example.com',      elo_rating: 2318, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-06-19T06:05:47Z') } },
    { uid: 'P045', email: 'ethan.brown45@example.com',       passwordHash: 'demo', profile: { username: 'Ethan Brown',        email: 'ethan.brown45@example.com',       elo_rating: 2292, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-09-10T10:58:37Z') } },
    { uid: 'P050', email: 'lily.walker50@example.com',       passwordHash: 'demo', profile: { username: 'Lily Walker',        email: 'lily.walker50@example.com',       elo_rating: 2307, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-05-25T22:27:21Z') } },
    { uid: 'P052', email: 'mason.carter52@example.com',      passwordHash: 'demo', profile: { username: 'Mason Carter',       email: 'mason.carter52@example.com',      elo_rating: 2051, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-11-18T04:03:03Z') } },
    { uid: 'P063', email: 'chloe.lee63@example.com',         passwordHash: 'demo', profile: { username: 'Chloe Lee',          email: 'chloe.lee63@example.com',         elo_rating: 1233, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2026-04-20T19:16:49Z') } },
    { uid: 'P064', email: 'ella.nelson64@example.com',       passwordHash: 'demo', profile: { username: 'Ella Nelson',        email: 'ella.nelson64@example.com',       elo_rating: 1316, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2026-04-30T17:40:40Z') } },
    { uid: 'P074', email: 'ella.khan74@example.com',         passwordHash: 'demo', profile: { username: 'Ella Khan',          email: 'ella.khan74@example.com',         elo_rating: 1329, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-07-05T10:32:27Z') } },
    { uid: 'P080', email: 'oliver.mitchell80@example.com',   passwordHash: 'demo', profile: { username: 'Oliver Mitchell',    email: 'oliver.mitchell80@example.com',   elo_rating: 2250, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-11-14T06:36:50Z') } },
    { uid: 'P084', email: 'alexander.ahmed84@example.com',   passwordHash: 'demo', profile: { username: 'Alexander Ahmed',    email: 'alexander.ahmed84@example.com',   elo_rating: 2020, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-08-21T15:53:13Z') } },
    { uid: 'P089', email: 'chloe.garcia89@example.com',      passwordHash: 'demo', profile: { username: 'Chloe Garcia',       email: 'chloe.garcia89@example.com',      elo_rating: 1091, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-08-13T11:22:42Z') } },
    { uid: 'P090', email: 'james.carter90@example.com',      passwordHash: 'demo', profile: { username: 'James Carter',       email: 'james.carter90@example.com',      elo_rating: 1699, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2025-02-10T10:17:59Z') } },
    { uid: 'P093', email: 'evelyn.king93@example.com',       passwordHash: 'demo', profile: { username: 'Evelyn King',        email: 'evelyn.king93@example.com',       elo_rating: 1369, avg_accuracy: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, created_at: Date.parse('2024-07-17T17:58:21Z') } },
  ].filter(p => !knownUids.has(p.uid));

  // Give every demo player believable stats so the leaderboard / their
  // profile pages don't look empty.
  enrichDummyStats(demoPlayers);

  if (demoPlayers.length > 0) {
    writeArray(KEY_USERS, [...existingUsers, ...demoPlayers]);
  }

  // Generate per-dummy match history so visiting a demo player's profile
  // shows real-looking games. We pool all demo players (already seeded
  // and newly seeded) so opponents are drawn from the full roster.
  const allDemo = readArray<StoredUserBlob>(KEY_USERS).filter(u => /^P\d/.test(u.uid));
  seedDummyHistories(allDemo);

  // ── Milestone 5: Sample tournaments (15 non-cancelled from tournament.csv) ─
  if (listTournaments().length === 0) {
    writeArray<Tournament>(KEY_TOURNAMENTS, [
      { tid: 'T001', name: 'Masters Cup 1',   struct_id: 'S043', game_type_id: 'GT028', organizer_pid: 'P063', reward: 'ELO Bonus',      scheduled_at: Date.parse('2026-07-08T14:06:44Z'), max_participants: 128, entry_elo_min: 1000, entry_elo_max: 2000, status: 'scheduled', created_at: Date.parse('2026-03-01T00:00:00Z') },
      { tid: 'T002', name: 'Open Cup 2',      struct_id: 'S028', game_type_id: 'GT008', organizer_pid: 'P037', reward: 'Medal',          scheduled_at: Date.parse('2026-05-31T13:14:39Z'), max_participants: 128, entry_elo_min: 1000, entry_elo_max: 1800, status: 'active',    created_at: Date.parse('2026-02-01T00:00:00Z') },
      { tid: 'T003', name: 'Summer Cup 3',    struct_id: 'S039', game_type_id: 'GT004', organizer_pid: 'P001', reward: 'Gift Card',      scheduled_at: Date.parse('2026-06-20T00:07:18Z'), max_participants:  32, entry_elo_min:  800, entry_elo_max: 2200, status: 'completed', created_at: Date.parse('2026-01-15T00:00:00Z') },
      { tid: 'T004', name: 'Open Cup 4',      struct_id: 'S008', game_type_id: 'GT001', organizer_pid: 'P064', reward: 'ELO Bonus',      scheduled_at: Date.parse('2026-05-24T22:19:19Z'), max_participants:  32, entry_elo_min:  800, entry_elo_max: 2600, status: 'active',    created_at: Date.parse('2026-01-20T00:00:00Z') },
      { tid: 'T007', name: 'Winter Cup 7',    struct_id: 'S021', game_type_id: 'GT011', organizer_pid: 'P080', reward: 'Medal',          scheduled_at: Date.parse('2026-08-25T14:23:49Z'), max_participants:  64, entry_elo_min:    0, entry_elo_max: 2600, status: 'scheduled', created_at: Date.parse('2026-02-10T00:00:00Z') },
      { tid: 'T008', name: 'Masters Cup 8',   struct_id: 'S028', game_type_id: 'GT038', organizer_pid: 'P052', reward: 'Badge',          scheduled_at: Date.parse('2026-06-21T23:52:26Z'), max_participants: 128, entry_elo_min: 1000, entry_elo_max: 2200, status: 'active',    created_at: Date.parse('2026-02-15T00:00:00Z') },
      { tid: 'T009', name: 'Masters Cup 9',   struct_id: 'S050', game_type_id: 'GT011', organizer_pid: 'P010', reward: 'Medal',          scheduled_at: Date.parse('2026-05-26T20:25:28Z'), max_participants:  16, entry_elo_min:  800, entry_elo_max: 2200, status: 'completed', created_at: Date.parse('2026-01-05T00:00:00Z') },
      { tid: 'T010', name: 'Autumn Cup 10',   struct_id: 'S016', game_type_id: 'GT007', organizer_pid: 'P019', reward: 'Trophy',         scheduled_at: Date.parse('2026-05-15T20:34:08Z'), max_participants:  32, entry_elo_min:  800, entry_elo_max: 1800, status: 'active',    created_at: Date.parse('2026-01-10T00:00:00Z') },
      { tid: 'T017', name: 'Open Cup 17',     struct_id: 'S044', game_type_id: 'GT039', organizer_pid: 'P007', reward: 'Medal',          scheduled_at: Date.parse('2026-08-28T21:48:37Z'), max_participants:  64, entry_elo_min:    0, entry_elo_max: 2200, status: 'scheduled', created_at: Date.parse('2026-03-15T00:00:00Z') },
      { tid: 'T018', name: 'Open Cup 18',     struct_id: 'S019', game_type_id: 'GT017', organizer_pid: 'P093', reward: 'Premium Month',  scheduled_at: Date.parse('2026-06-16T15:02:22Z'), max_participants:  32, entry_elo_min: 1000, entry_elo_max: 1800, status: 'active',    created_at: Date.parse('2026-02-20T00:00:00Z') },
      { tid: 'T020', name: 'Open Cup 20',     struct_id: 'S009', game_type_id: 'GT043', organizer_pid: 'P090', reward: 'Medal',          scheduled_at: Date.parse('2026-07-25T01:37:24Z'), max_participants:  16, entry_elo_min: 1200, entry_elo_max: 2200, status: 'scheduled', created_at: Date.parse('2026-03-01T00:00:00Z') },
      { tid: 'T021', name: 'Autumn Cup 21',   struct_id: 'S020', game_type_id: 'GT012', organizer_pid: 'P028', reward: 'ELO Bonus',      scheduled_at: Date.parse('2026-06-07T07:39:18Z'), max_participants:  32, entry_elo_min:  800, entry_elo_max: 2000, status: 'active',    created_at: Date.parse('2026-02-05T00:00:00Z') },
      { tid: 'T023', name: 'Masters Cup 23',  struct_id: 'S011', game_type_id: 'GT012', organizer_pid: 'P089', reward: 'Trophy',         scheduled_at: Date.parse('2026-04-18T09:44:23Z'), max_participants: 128, entry_elo_min:    0, entry_elo_max: 2600, status: 'completed', created_at: Date.parse('2026-01-01T00:00:00Z') },
      { tid: 'T025', name: 'Winter Cup 25',   struct_id: 'S024', game_type_id: 'GT044', organizer_pid: 'P074', reward: 'ELO Bonus',      scheduled_at: Date.parse('2026-05-02T20:21:42Z'), max_participants:  64, entry_elo_min: 1200, entry_elo_max: 2600, status: 'active',    created_at: Date.parse('2026-01-25T00:00:00Z') },
      { tid: 'T026', name: 'Spring Cup 26',   struct_id: 'S039', game_type_id: 'GT009', organizer_pid: 'P033', reward: 'Medal',          scheduled_at: Date.parse('2026-09-05T01:19:03Z'), max_participants: 128, entry_elo_min: 1000, entry_elo_max: 1800, status: 'scheduled', created_at: Date.parse('2026-03-20T00:00:00Z') },
    ]);
  }

  // ── Milestone 5: Sample groups + members (from group_t.csv / group_list.csv)
  if (listGroups().length === 0) {
    writeArray<Group>(KEY_GROUPS, [
      { gid: 'GR001', group_name: 'Global Guild 1',   description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P022', banner_url: null, max_members:  25, is_public: false, created_at: Date.parse('2025-12-29T06:49:25Z') },
      { gid: 'GR002', group_name: 'Casual Guild 2',   description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P002', banner_url: null, max_members:  50, is_public: true,  created_at: Date.parse('2025-10-23T07:46:43Z') },
      { gid: 'GR003', group_name: 'Casual Guild 3',   description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P045', banner_url: null, max_members:  25, is_public: true,  created_at: Date.parse('2025-04-13T11:52:57Z') },
      { gid: 'GR004', group_name: 'Elite Guild 4',    description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P050', banner_url: null, max_members: 250, is_public: false, created_at: Date.parse('2025-08-19T16:46:23Z') },
      { gid: 'GR005', group_name: 'Elite Guild 5',    description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P064', banner_url: null, max_members: 100, is_public: true,  created_at: Date.parse('2026-01-29T00:59:09Z') },
      { gid: 'GR007', group_name: 'Blitz Guild 7',    description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P010', banner_url: null, max_members: 100, is_public: false, created_at: Date.parse('2025-04-28T02:16:51Z') },
      { gid: 'GR008', group_name: 'Blitz Guild 8',    description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P034', banner_url: null, max_members:  25, is_public: true,  created_at: Date.parse('2026-01-02T23:46:00Z') },
      { gid: 'GR011', group_name: 'Strategy Guild 11',description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P084', banner_url: null, max_members: 250, is_public: true,  created_at: Date.parse('2025-08-12T12:37:36Z') },
      { gid: 'GR016', group_name: 'Casual Guild 16',  description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P012', banner_url: null, max_members: 250, is_public: true,  created_at: Date.parse('2025-09-14T14:12:29Z') },
      { gid: 'GR017', group_name: 'Strategy Guild 17',description: 'Player group for practice games, tournaments, and chat coordination.', owner_pid: 'P004', banner_url: null, max_members:  50, is_public: true,  created_at: Date.parse('2025-11-25T03:45:35Z') },
    ]);
    writeArray<GroupMember>(KEY_GROUP_LIST, [
      // GR001
      { gid: 'GR001', pid: 'P022', role: 'owner',     joined_at: Date.parse('2025-12-29T06:49:25Z'), invited_by: null   },
      { gid: 'GR001', pid: 'P008', role: 'member',    joined_at: Date.parse('2026-01-15T10:00:00Z'), invited_by: 'P022' },
      { gid: 'GR001', pid: 'P021', role: 'moderator', joined_at: Date.parse('2026-02-01T08:30:00Z'), invited_by: 'P022' },
      // GR002
      { gid: 'GR002', pid: 'P002', role: 'owner',     joined_at: Date.parse('2025-10-23T07:46:43Z'), invited_by: null   },
      { gid: 'GR002', pid: 'P050', role: 'admin',     joined_at: Date.parse('2025-11-03T18:24:25Z'), invited_by: 'P074' },
      { gid: 'GR002', pid: 'P027', role: 'member',    joined_at: Date.parse('2025-11-20T12:00:00Z'), invited_by: 'P002' },
      // GR003
      { gid: 'GR003', pid: 'P045', role: 'owner',     joined_at: Date.parse('2025-04-13T11:52:57Z'), invited_by: null   },
      { gid: 'GR003', pid: 'P028', role: 'moderator', joined_at: Date.parse('2025-05-09T15:49:18Z'), invited_by: 'P025' },
      // GR004
      { gid: 'GR004', pid: 'P050', role: 'owner',     joined_at: Date.parse('2025-08-19T16:46:23Z'), invited_by: null   },
      { gid: 'GR004', pid: 'P014', role: 'member',    joined_at: Date.parse('2025-09-01T10:00:00Z'), invited_by: 'P050' },
      // GR005
      { gid: 'GR005', pid: 'P064', role: 'owner',     joined_at: Date.parse('2026-01-29T00:59:09Z'), invited_by: null   },
      { gid: 'GR005', pid: 'P033', role: 'member',    joined_at: Date.parse('2026-02-10T09:00:00Z'), invited_by: 'P064' },
      // GR007
      { gid: 'GR007', pid: 'P010', role: 'owner',     joined_at: Date.parse('2025-04-28T02:16:51Z'), invited_by: null   },
      { gid: 'GR007', pid: 'P018', role: 'admin',     joined_at: Date.parse('2025-10-12T13:54:53Z'), invited_by: 'P053' },
      // GR008
      { gid: 'GR008', pid: 'P034', role: 'owner',     joined_at: Date.parse('2026-01-02T23:46:00Z'), invited_by: null   },
      { gid: 'GR008', pid: 'P084', role: 'admin',     joined_at: Date.parse('2026-05-03T23:22:17Z'), invited_by: 'P082' },
      { gid: 'GR008', pid: 'P029', role: 'member',    joined_at: Date.parse('2026-03-10T14:00:00Z'), invited_by: 'P034' },
      // GR011
      { gid: 'GR011', pid: 'P084', role: 'owner',     joined_at: Date.parse('2025-08-12T12:37:36Z'), invited_by: null   },
      { gid: 'GR011', pid: 'P090', role: 'member',    joined_at: Date.parse('2025-09-01T08:00:00Z'), invited_by: 'P084' },
      // GR016
      { gid: 'GR016', pid: 'P012', role: 'owner',     joined_at: Date.parse('2025-09-14T14:12:29Z'), invited_by: null   },
      { gid: 'GR016', pid: 'P026', role: 'moderator', joined_at: Date.parse('2025-10-05T11:00:00Z'), invited_by: 'P012' },
      // GR017
      { gid: 'GR017', pid: 'P004', role: 'owner',     joined_at: Date.parse('2025-11-25T03:45:35Z'), invited_by: null   },
      { gid: 'GR017', pid: 'P093', role: 'moderator', joined_at: Date.parse('2025-12-06T14:30:49Z'), invited_by: 'P037' },
      { gid: 'GR017', pid: 'P023', role: 'member',    joined_at: Date.parse('2025-12-30T06:04:04Z'), invited_by: 'P095' },
    ]);
  }

  localStorage.setItem(SEED_FLAG, '1');
}

// ────────────────────────────────────────────────────────────
// Demo-player stat & history generation helpers
// ────────────────────────────────────────────────────────────

/**
 * Mutate each demo player's profile so they have a believable record:
 * matches played, wins/losses/draws, and an average accuracy roughly
 * proportional to their Elo bucket.
 */
function enrichDummyStats(users: StoredUserBlob[]): void {
  for (const u of users) {
    if (!u.profile) continue;
    const elo = u.profile.elo_rating;
    const skill = Math.max(0, Math.min(1, (elo - 800) / 1550));
    const matches = 40 + Math.floor(Math.random() * 240);
    const drawRate = 0.05 + Math.random() * 0.03;
    const draws = Math.round(matches * drawRate);
    const winRate = Math.max(0.30, Math.min(0.85, 0.30 + skill * 0.50));
    const wins = Math.round((matches - draws) * winRate);
    u.profile.matches_played = matches;
    u.profile.wins = wins;
    u.profile.draws = draws;
    u.profile.losses = matches - wins - draws;
    u.profile.avg_accuracy = Math.max(30, Math.min(95,
      Math.round(35 + skill * 48 + (Math.random() * 8 - 4)),
    ));
  }
}

/**
 * For each demo player, write a fake match history to
 * `match_history_<uid>` so their profile page has real-looking games.
 * Opponents are drawn from the supplied pool of demo players.
 */
function seedDummyHistories(pool: StoredUserBlob[]): void {
  if (pool.length < 2) return;
  const day = 86_400_000;
  for (const u of pool) {
    if (!u.profile) continue;
    const existing = localStorage.getItem(`match_history_${u.uid}`);
    if (existing) continue; // don't clobber any real history
    const skill = Math.max(0, Math.min(1, (u.profile.elo_rating - 800) / 1550));
    const winRate = Math.max(0.30, Math.min(0.85, 0.30 + skill * 0.50));
    const drawRate = 0.06;
    const n = 15 + Math.floor(Math.random() * 11);
    const records: Array<Record<string, unknown>> = [];
    for (let i = 0; i < n; i++) {
      let opp = pool[Math.floor(Math.random() * pool.length)];
      let guard = 0;
      while ((!opp || opp.uid === u.uid || !opp.profile) && guard < 5) {
        opp = pool[Math.floor(Math.random() * pool.length)];
        guard++;
      }
      if (!opp || opp.uid === u.uid || !opp.profile) continue;
      const r = Math.random();
      const winner = r < drawRate ? 'Draw' : (r < drawRate + (1 - drawRate) * winRate ? 'X' : 'O');
      records.push({
        id: `seed_${u.uid}_${i}`,
        player_x: u.uid,
        player_o: opp.uid,
        player_x_name: u.profile.username,
        player_o_name: opp.profile.username,
        winner,
        status: 'completed',
        moves_count: 14 + Math.floor(Math.random() * 47),
        created_at: Date.now() - Math.floor(Math.random() * 120 + 1) * day,
        isBotMatch: false,
      });
    }
    records.sort((a, b) => (b.created_at as number) - (a.created_at as number));
    try {
      localStorage.setItem(`match_history_${u.uid}`, JSON.stringify(records));
    } catch { /* quota — ignore */ }
  }
}

// ────────────────────────────────────────────────────────────
// Convenience: humanise structure / notification labels
// ────────────────────────────────────────────────────────────

export const STRUCTURE_LABELS: Record<StructureFormat, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
  swiss: 'Swiss',
  league: 'League',
  ladder: 'Ladder',
};

export const SEEDING_LABELS: Record<SeedingMethod, string> = {
  random: 'Random',
  elo_based: 'Elo-based',
  manual: 'Manual',
  regional: 'Regional',
  balanced: 'Balanced',
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  friend_request: 'Friend',
  tournament_invite: 'Tournament',
  game_result: 'Game',
  group_invite: 'Group',
  rank_update: 'Rank',
  chat_message: 'Chat',
};

export const TOURNAMENT_STATUS_COLORS: Record<TournamentStatus, string> = {
  scheduled: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  active: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  completed: 'bg-slate-600/20 text-slate-400 border-slate-500/40',
  cancelled: 'bg-red-500/15 text-red-500 border-red-500/30',
};
