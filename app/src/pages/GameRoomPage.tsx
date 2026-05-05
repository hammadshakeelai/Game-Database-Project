import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, saveLocalProfile } from '../AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useGameState } from '../hooks/useGameState';
import SuperBoard from '../components/SuperBoard';
import EvalBar from '../components/EvalBar';
import MoveLog from '../components/MoveLog';
import ChatBox from '../components/ChatBox';
import GameOverModal from '../components/GameOverModal';
import DrawOfferModal, { DrawDeclinedToast } from '../components/DrawOfferModal';
import ConnectionStatus from '../components/ConnectionStatus';
import { cn, saveMatchToHistory } from '../utils';

export default function GameRoomPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { socket, status: connStatus } = useSocket();

  const {
    gameState,
    playerRole,
    accuracyLog,
    evaluation,
    hintMove,
    gameOverData,
    drawOffer,
    drawDeclined,
    opponentDisconnected,
    makeMove,
    requestHint,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    dismissGameOver,
    dismissDrawDeclined,
  } = useGameState({ socket, matchId, userId: user?.uid });

  // Chat state (managed here since ChatBox is a presentation component)
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string; timestamp: number }[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const accuracyLogRef = useRef(accuracyLog);
  accuracyLogRef.current = accuracyLog;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Listen for chat messages
  useEffect(() => {
    if (!socket) return;

    const onReceiveMessage = (data: { sender: string; message: string; timestamp: number }) => {
      setChatMessages(prev => [...prev, data]);
    };

    socket.on('receive_message', onReceiveMessage);
    return () => { socket.off('receive_message', onReceiveMessage); };
  }, [socket]);

  // Handle game over — save stats locally
  useEffect(() => {
    if (!gameOverData || !user || !profile) return;

    setShowGameOver(true);
    const { winner, matchDetails } = gameOverData;

    try {
      const isPlayerX = matchDetails.player_x === user.uid;
      const isPlayerO = matchDetails.player_o === user.uid;

      if (isPlayerX || isPlayerO) {
        const isWinner = (isPlayerX && winner === 'X') || (isPlayerO && winner === 'O');
        const isDraw = winner === 'Draw';
        const isLoser = !isWinner && !isDraw;

        const eloChange = matchDetails.isBotMatch ? 0 : (isWinner ? 15 : isDraw ? 0 : -15);
        const newElo = Math.max(0, profile.elo_rating + eloChange);

        let newAvgAccuracy = profile.avg_accuracy;
        if (!matchDetails.isBotMatch) {
          let myAccuracy = 0;
          const myRole = isPlayerX ? 'X' : 'O';
          const myMoves = accuracyLogRef.current.filter(log => log.move.player === myRole);
          if (myMoves.length > 0) {
            const totalDelta = myMoves.reduce((sum, log) => sum + Math.max(0, 1000 - Math.abs(log.delta)), 0);
            myAccuracy = Math.round((totalDelta / (myMoves.length * 1000)) * 100);
          }
          newAvgAccuracy = Math.round(
            ((profile.avg_accuracy * profile.matches_played) + myAccuracy) / (profile.matches_played + 1)
          );
        }

        const updatedProfile = {
          ...profile,
          matches_played: matchDetails.isBotMatch ? profile.matches_played : profile.matches_played + 1,
          wins: matchDetails.isBotMatch ? profile.wins : profile.wins + (isWinner ? 1 : 0),
          losses: matchDetails.isBotMatch ? profile.losses : profile.losses + (isLoser ? 1 : 0),
          draws: matchDetails.isBotMatch ? profile.draws : profile.draws + (isDraw ? 1 : 0),
          elo_rating: newElo,
          avg_accuracy: newAvgAccuracy,
        };

        saveLocalProfile(user.uid, updatedProfile);
        window.dispatchEvent(new Event('profile-updated'));

        // Save completed game record for review
        const currentGameState = gameStateRef.current;
        if (matchId && currentGameState) {
          const reviewRecord = {
            matchId,
            moves: currentGameState.moves,
            accuracyLog: accuracyLogRef.current,
            playerXName: matchDetails.player_x,
            playerOName: matchDetails.player_o,
            winner,
            playerRole: isPlayerX ? 'X' : 'O',
            timestamp: Date.now(),
          };
          localStorage.setItem(`review_${matchId}`, JSON.stringify(reviewRecord));

          // Save to match history list for lobby/profile display
          saveMatchToHistory(user.uid, {
            id: matchId,
            player_x: matchDetails.player_x,
            player_o: matchDetails.player_o,
            player_x_name: isPlayerX ? (profile.username || '') : (matchDetails.isBotMatch ? 'BOT' : matchDetails.player_o),
            player_o_name: isPlayerX ? (matchDetails.isBotMatch ? 'BOT' : matchDetails.player_o) : (profile.username || ''),
            winner: winner ?? 'Draw',
            status: 'completed',
            moves_count: matchDetails.moves_count,
            created_at: Date.now(),
            isBotMatch: matchDetails.isBotMatch,
            botDifficulty: matchDetails.botDifficulty,
          });
        }
      }
    } catch (error) {
      console.error('Error saving match stats:', error);
    }
  }, [gameOverData]);

  const handleSendChat = (message: string) => {
    if (!socket) return;
    socket.emit('send_message', {
      roomId: matchId,
      sender: profile?.username || user?.displayName || 'Player',
      message,
      timestamp: Date.now(),
    });
  };

  const handleResign = () => {
    if (confirmResign) {
      resign();
      setConfirmResign(false);
    } else {
      setConfirmResign(true);
      setTimeout(() => setConfirmResign(false), 3000);
    }
  };

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  const handleReviewGame = () => {
    navigate(`/review/${matchId}`);
  };

  // Loading state
  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
        <p className="text-slate-400">Connecting to match...</p>
        <ConnectionStatus status={connStatus} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="p-3 sm:p-4 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/lobby')} className="text-slate-400 hover:text-white transition-colors text-sm">
            ← Lobby
          </button>
          <h1 className="text-sm sm:text-lg font-bold text-white">
            Match: <span className="text-indigo-400 font-mono">{matchId}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); }}
            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 text-xs font-medium transition-colors"
          >
            📋 Share
          </button>
          <button
            onClick={requestHint}
            disabled={gameState.currentPlayer !== playerRole || gameState.winner !== null}
            className="px-3 py-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-sky-500/20 text-xs font-medium transition-colors"
          >
            💡 Hint
          </button>
          <button
            onClick={handleResign}
            disabled={playerRole === 'Spectator'}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
              confirmResign
                ? "bg-red-600 text-white border-red-500 animate-pulse"
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
            )}
          >
            {confirmResign ? 'Confirm?' : '🏳️ Resign'}
          </button>
          <button
            onClick={offerDraw}
            disabled={playerRole === 'Spectator'}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 text-xs font-medium transition-colors"
          >
            🤝 Draw
          </button>
          <ConnectionStatus status={connStatus} />
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Eval Bar */}
        <EvalBar evaluation={evaluation} />

        {/* Game Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
          {/* Turn Indicator */}
          <div className="mb-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              {gameState.winner ? (
                <span className="text-emerald-400">Winner: {gameState.winner}</span>
              ) : (
                <span>
                  Current Turn:{' '}
                  <span className={gameState.currentPlayer === 'X' ? 'text-indigo-400' : 'text-rose-400'}>
                    {gameState.currentPlayer}
                  </span>
                </span>
              )}
            </h2>
            <p className="text-slate-400 text-sm">
              You are: <strong className={cn(
                playerRole === 'X' ? 'text-indigo-400' : playerRole === 'O' ? 'text-rose-400' : 'text-slate-300'
              )}>{playerRole}</strong>
            </p>
            {opponentDisconnected && (
              <p className="text-amber-400 text-xs mt-1 animate-pulse">⚠ Opponent disconnected</p>
            )}
          </div>

          {/* Board */}
          <SuperBoard
            gameState={gameState}
            playerRole={playerRole}
            hintMove={hintMove}
            onCellClick={makeMove}
          />
        </main>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/50 flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="flex-1 min-h-0 overflow-hidden">
            <MoveLog accuracyLog={accuracyLog} />
          </div>
          <div className="h-64 lg:h-1/2 border-t border-slate-800">
            <ChatBox
              messages={chatMessages}
              onSend={handleSendChat}
              currentUserName={profile?.username || ''}
              title="Match Chat"
              placeholder="Type a message..."
              emptyMessage="Say hi to your opponent!"
            />
          </div>
        </aside>
      </div>

      {/* Modals */}
      {showGameOver && gameOverData && (
        <GameOverModal
          winner={gameOverData.winner}
          playerRole={playerRole}
          onBackToLobby={handleBackToLobby}
          onReview={handleReviewGame}
        />
      )}

      {drawOffer && (
        <DrawOfferModal
          offeredBy={drawOffer.by}
          onAccept={acceptDraw}
          onDecline={declineDraw}
        />
      )}

      {drawDeclined && (
        <DrawDeclinedToast onDismiss={dismissDrawDeclined} />
      )}
    </div>
  );
}
