import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl text-center space-y-8 z-10"
      >
        {/* Logo / Title */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 animate-gradient-text">
              Super Tic-Tac-Toe
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed"
        >
          Experience the ultimate strategic challenge. 9 boards, 1 winner.
          Play against friends, climb the Elo ladder, and analyze your moves with our AI grader.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {['Real-time PvP', 'AI Analysis', 'Elo Rating', 'Move Accuracy'].map((feat) => (
            <span key={feat} className="px-4 py-1.5 bg-slate-800/80 border border-slate-700 rounded-full text-sm text-slate-300 font-medium">
              {feat}
            </span>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-4 pt-4"
        >
          <Link
            to="/register"
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 rounded-xl font-bold transition-all hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-indigo-500/30"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all hover:scale-[1.03] active:scale-[0.98] border border-slate-700"
          >
            Sign In
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
