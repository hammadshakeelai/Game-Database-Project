import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket | null;
  userId: string;
  onCancel: () => void;
}

export default function QuickMatchOverlay({ socket, userId, onCancel }: Props) {
  const navigate = useNavigate();
  const [matched, setMatched] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onFound = (data: { matchId: string }) => {
      setMatched(true);
      setTimeout(() => navigate(`/play/${data.matchId}`), 350);
    };
    const onCancelled = () => onCancel();
    socket.on('match_found', onFound);
    socket.on('queue_cancelled', onCancelled);
    return () => {
      socket.off('match_found', onFound);
      socket.off('queue_cancelled', onCancelled);
    };
  }, [socket, navigate, onCancel]);

  const handleCancel = () => {
    socket?.emit('leave_queue', { userId });
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md bg-slate-800 border border-indigo-500/30 rounded-3xl p-10 text-center shadow-2xl overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="mx-auto mb-6 w-20 h-20 relative">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-400 border-r-indigo-400 animate-spin" />
          </div>

          <h2 className="text-2xl font-bold text-white font-serif mb-1">
            {matched ? 'Opponent found!' : 'Searching for opponent…'}
          </h2>
          <p className="text-sm text-slate-400 mb-8">
            {matched ? 'Loading the match…' : 'Matching you with a player of similar rank.'}
          </p>

          <button
            onClick={handleCancel}
            disabled={matched}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
