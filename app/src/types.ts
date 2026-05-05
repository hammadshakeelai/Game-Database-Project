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
