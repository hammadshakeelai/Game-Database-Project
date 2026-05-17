// ============================================================
// Core Game Types
// ============================================================

export type Player = 'X' | 'O' | null;
export type BoardState = Player[];
export type SuperBoardState = BoardState[];

export interface GameState {
  superBoard: SuperBoardState;
  subBoardWinners: (Player | 'Draw')[];
  currentPlayer: 'X' | 'O';
  nextRequiredSubBoard: number | null;
  winner: Player | 'Draw';
  moves: Move[];
}

export interface Move {
  superGridIndex: number;
  subGridIndex: number;
  player: 'X' | 'O';
}

// ============================================================
// AI & Evaluation Types
// ============================================================

export interface AccuracyResult {
  bestMove: Move | null;
  heuristicDelta: number;
  label: AccuracyLabel;
}

export type AccuracyLabel = 'Best Move' | 'Good Move' | 'Inaccuracy' | 'Blunder' | 'Forced';

export interface MoveAccuracyLog {
  move: Move;
  label: AccuracyLabel;
  delta: number;
}

// ============================================================
// User & Profile Types
// ============================================================

export interface UserProfile {
  username: string;
  email: string;
  elo_rating: number;
  avg_accuracy: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: number;
}

// ============================================================
// Socket Event Types
// ============================================================

export interface MatchDetails {
  player_x: string;
  player_o: string;
  isBotMatch: boolean;
  moves_count: number;
  botDifficulty?: number;
}

export interface ClientToServerEvents {
  create_match: (data: {
    matchId: string;
    userId: string;
    isBotMatch?: boolean;
    botDifficulty?: number;
  }) => void;
  join_match: (data: { matchId: string; userId: string }) => void;
  make_move: (data: { matchId: string; move: Move }) => void;
  request_hint: (data: { matchId: string }) => void;
  resign: (data: { matchId: string; player: 'X' | 'O' }) => void;
  offer_draw: (data: { matchId: string; player: 'X' | 'O' }) => void;
  accept_draw: (data: { matchId: string }) => void;
  decline_draw: (data: { matchId: string }) => void;
  send_message: (data: {
    roomId: string;
    sender: string;
    message: string;
    timestamp: number;
  }) => void;
}

export interface ServerToClientEvents {
  match_joined: (data: { state: GameState; role: 'X' | 'O' | 'Spectator' }) => void;
  match_state: (state: GameState) => void;
  move_made: (data: {
    move: Move;
    state: GameState;
    accuracy: AccuracyResult;
    evaluation: number;
  }) => void;
  receive_hint: (move: Move) => void;
  game_over: (data: { winner: Player | 'Draw'; matchDetails: MatchDetails }) => void;
  draw_offered: (data: { by: 'X' | 'O' }) => void;
  draw_declined: () => void;
  receive_message: (data: {
    sender: string;
    message: string;
    timestamp: number;
  }) => void;
  error: (data: { message: string }) => void;
}

// ============================================================
// Chat Types
// ============================================================

export interface ChatMessage {
  id?: string;
  sender: string;
  sender_id?: string;
  sender_name?: string;
  message: string;
  timestamp: number;
}

// ============================================================
// Match Record Types
// ============================================================

export interface MatchRecord {
  id: string;
  player_x: string;
  player_o: string;
  player_x_name: string;
  player_o_name: string;
  winner: string;
  status: 'completed' | 'abandoned' | 'resigned' | 'timeout';
  moves_count: number;
  created_at: number;
  isBotMatch?: boolean;
  botDifficulty?: number;
}

// ============================================================
// Review / Replay Types
// ============================================================

export interface CompletedGameRecord {
  matchId: string;
  moves: Move[];
  accuracyLog: MoveAccuracyLog[];
  playerXName: string;
  playerOName: string;
  winner: Player | 'Draw' | null;
  playerRole: 'X' | 'O' | 'Spectator';
  timestamp: number;
}

export interface CoachComment {
  headline: string;
  detail: string;
  bestMoveDescription: string | null;
}

// ============================================================
// ERD Entity Types — mirror milestone4_ddl.sql tables
// ============================================================

/** GAMETYPE — defines a game variant (board size, ranked, time limit) */
export interface GameType {
  gt_id: string;
  type_name: string;
  description: string;
  max_duration_sec: number;
  is_ranked: boolean;
  board_size: string;
  created_at: number;
}

/** STRUCTURE — tournament format definitions */
export type StructureFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'league'
  | 'ladder';

export type SeedingMethod =
  | 'random'
  | 'elo_based'
  | 'manual'
  | 'regional'
  | 'balanced';

export interface Structure {
  struct_id: string;
  format_type: StructureFormat;
  details: string;
  rounds: number;
  seeding_method: SeedingMethod;
}

/** TOURNAMENT */
export type TournamentStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Tournament {
  tid: string;
  name: string;
  struct_id: string;
  game_type_id: string;
  organizer_pid: string;
  reward: string;
  scheduled_at: number;
  max_participants: number;
  entry_elo_min: number;
  entry_elo_max: number;
  status: TournamentStatus;
  created_at: number;
}

/** PARTICIPANT — junction table tournament <-> player */
export interface Participant {
  tid: string;
  pid: string;
  seed: number | null;
  enrolled_at: number;
  eliminated: boolean;
  final_rank: number | null;
  prize_awarded: string | null;
}

/** FRIENDS — self-referencing M:N over player */
export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface Friend {
  pid1: string;
  pid2: string;
  since: number;
  status: FriendStatus;
  requested_by: string;
}

/** GROUP_T */
export interface Group {
  gid: string;
  group_name: string;
  description: string;
  owner_pid: string;
  banner_url: string | null;
  max_members: number;
  created_at: number;
  is_public: boolean;
}

/** GROUP_LIST — junction table */
export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface GroupMember {
  gid: string;
  pid: string;
  role: GroupRole;
  joined_at: number;
  invited_by: string | null;
}

/** NOTIFICATION */
export type NotificationType =
  | 'friend_request'
  | 'tournament_invite'
  | 'game_result'
  | 'group_invite'
  | 'rank_update'
  | 'chat_message';

export interface Notification {
  nid: string;
  recipient_pid: string;
  type: NotificationType;
  ref_id: string | null;
  content: string;
  is_read: boolean;
  created_at: number;
}
