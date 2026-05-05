import { motion, AnimatePresence } from 'motion/react';

interface DrawOfferModalProps {
  offeredBy: 'X' | 'O';
  onAccept: () => void;
  onDecline: () => void;
}

export default function DrawOfferModal({ offeredBy, onAccept, onDecline }: DrawOfferModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl text-center"
        >
          <div className="text-4xl mb-4">🤝</div>
          <h3 className="text-xl font-bold text-white mb-2">Draw Offer</h3>
          <p className="text-slate-400 mb-6">Your opponent ({offeredBy}) is offering a draw.</p>
          <div className="flex gap-3">
            <button onClick={onDecline} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all">Decline</button>
            <button onClick={onAccept} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20">Accept</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function DrawDeclinedToast({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 bg-slate-800 border border-amber-500/30 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3"
    >
      <span className="text-amber-400 font-medium text-sm">Draw offer was declined.</span>
      <button onClick={onDismiss} className="text-slate-400 hover:text-white transition-colors">✕</button>
    </motion.div>
  );
}
