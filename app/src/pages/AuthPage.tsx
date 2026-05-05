import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registerWithEmail, loginWithEmail } from '../AuthContext';
import { motion } from 'motion/react';
import { cn } from '../utils';

function SimpleTicTacToeDemo() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    if (!squares.includes(null)) return 'Draw';
    return null;
  };

  const handleMove = (idx: number) => {
    if (board[idx] || winner) return;
    
    const newBoard = [...board];
    newBoard[idx] = 'X';
    let currentWinner = checkWinner(newBoard);
    setBoard(newBoard);
    setWinner(currentWinner);

    if (!currentWinner) {
      setTimeout(() => {
        const emptyIndices = newBoard.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (emptyIndices.length > 0) {
          const botIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          const botBoard = [...newBoard];
          botBoard[botIdx] = 'O';
          setBoard(botBoard);
          setWinner(checkWinner(botBoard));
        }
      }, 400);
    }
  };

  const reset = () => { setBoard(Array(9).fill(null)); setWinner(null); };

  return (
    <div className="flex flex-col items-center bg-slate-800/80 p-6 rounded-2xl shadow-xl w-full max-w-sm border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-1">Simple Tic-Tac-Toe</h3>
      <p className="text-slate-400 text-sm mb-6">Play against a random bot!</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleMove(idx)}
            disabled={!!cell || !!winner}
            className={cn(
              "w-16 h-16 flex items-center justify-center text-3xl font-bold rounded-xl transition-all duration-200",
              !cell && !winner ? "bg-slate-700 hover:bg-slate-600 cursor-pointer" : "bg-slate-900/50 cursor-default",
              cell === 'X' ? "text-indigo-400" : "text-rose-400"
            )}
          >
            {cell && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{cell}</motion.span>
            )}
          </button>
        ))}
      </div>
      {winner ? (
        <div className="text-center h-10">
          <div className="text-lg font-bold text-emerald-400 mb-2">{winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}</div>
          <button onClick={reset} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">Play Again</button>
        </div>
      ) : (
        <div className="h-10"></div>
      )}
    </div>
  );
}

function SuperTicTacToeDemo() {
  const [superBoard, setSuperBoard] = useState<(string | null)[][]>(Array(9).fill(null).map(() => Array(9).fill(null)));
  const [subWinners, setSubWinners] = useState<(string | null)[]>(Array(9).fill(null));
  const [nextRequired, setNextRequired] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const checkLine = (squares: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    if (!squares.includes(null)) return 'Draw';
    return null;
  };

  const handleMove = (superIdx: number, subIdx: number) => {
    if (winner) return;
    if (nextRequired !== null && nextRequired !== superIdx) return;
    if (subWinners[superIdx] !== null) return;
    if (superBoard[superIdx][subIdx] !== null) return;

    const newSuperBoard = superBoard.map(arr => [...arr]);
    newSuperBoard[superIdx][subIdx] = 'X';
    
    const newSubWinners = [...subWinners];
    const subWinner = checkLine(newSuperBoard[superIdx]);
    if (subWinner) newSubWinners[superIdx] = subWinner;

    const gameWinner = checkLine(newSubWinners);
    
    let nextReq: number | null = subIdx;
    if (newSubWinners[nextReq] !== null) nextReq = null;

    setSuperBoard(newSuperBoard);
    setSubWinners(newSubWinners);
    setNextRequired(nextReq);
    setWinner(gameWinner);

    if (!gameWinner) {
      setTimeout(() => {
        let botSuperIdx = nextReq;
        if (botSuperIdx === null) {
          const availableSuper = newSubWinners.map((w, i) => w === null ? i : null).filter(v => v !== null) as number[];
          if (availableSuper.length === 0) {
            setWinner('Draw');
            return;
          }
          botSuperIdx = availableSuper[Math.floor(Math.random() * availableSuper.length)];
        }

        const availableSub = newSuperBoard[botSuperIdx].map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];
        if (availableSub.length > 0) {
          const botSubIdx = availableSub[Math.floor(Math.random() * availableSub.length)];
          
          const botSuperBoard = newSuperBoard.map(arr => [...arr]);
          botSuperBoard[botSuperIdx][botSubIdx] = 'O';
          
          const botSubWinners = [...newSubWinners];
          const bSubWinner = checkLine(botSuperBoard[botSuperIdx]);
          if (bSubWinner) botSubWinners[botSuperIdx] = bSubWinner;

          const bGameWinner = checkLine(botSubWinners);
          
          let bNextReq: number | null = botSubIdx;
          if (botSubWinners[bNextReq] !== null) bNextReq = null;

          setSuperBoard(botSuperBoard);
          setSubWinners(botSubWinners);
          setNextRequired(bNextReq);
          setWinner(bGameWinner);
        }
      }, 400);
    }
  };

  const reset = () => {
    setSuperBoard(Array(9).fill(null).map(() => Array(9).fill(null)));
    setSubWinners(Array(9).fill(null));
    setNextRequired(null);
    setWinner(null);
  };

  return (
    <div className="flex flex-col items-center bg-slate-800/80 p-6 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-1">Super Tic-Tac-Toe</h3>
      <p className="text-slate-400 text-sm mb-6">A game of games. Play against the bot!</p>
      <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-900 p-3 rounded-xl shadow-inner">
        {superBoard.map((subBoard, superIdx) => {
          const isRequired = nextRequired === superIdx;
          const isFree = nextRequired === null && subWinners[superIdx] === null;
          const isPlayable = (isRequired || isFree) && !winner;
          const sWinner = subWinners[superIdx];

          return (
            <div key={superIdx} className={cn(
              "relative grid grid-cols-3 gap-1 p-1.5 rounded-lg transition-all duration-300",
              isPlayable ? "bg-indigo-500/20 ring-2 ring-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "bg-slate-800",
              sWinner ? "opacity-50" : ""
            )}>
              {sWinner && sWinner !== 'Draw' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80 rounded-lg backdrop-blur-sm">
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("text-5xl font-black", sWinner === 'X' ? "text-indigo-500" : "text-rose-500")}>{sWinner}</motion.span>
                </div>
              )}
              {subBoard.map((cell, subIdx) => (
                <button
                  key={subIdx}
                  onClick={() => handleMove(superIdx, subIdx)}
                  disabled={!isPlayable || !!cell || !!sWinner}
                  className={cn(
                    "w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-sm sm:text-lg font-bold rounded transition-colors",
                    !cell && isPlayable ? "bg-slate-700 hover:bg-slate-600 cursor-pointer" : "bg-slate-900/50 cursor-default",
                    cell === 'X' ? "text-indigo-400" : "text-rose-400"
                  )}
                >
                  {cell && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{cell}</motion.span>}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      {winner ? (
        <div className="text-center h-10">
          <div className="text-lg font-bold text-emerald-400 mb-2">{winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}</div>
          <button onClick={reset} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">Play Again</button>
        </div>
      ) : (
        <div className="h-10"></div>
      )}
    </div>
  );
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential': return 'Invalid email or password. Please try again.';
      case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      default: return 'Something went wrong. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password);
      }
      // Force a page reload to pick up the new session in AuthContext
      window.location.href = '/lobby';
    } catch (err: any) {
      setError(getErrorMessage(err.code || err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row overflow-hidden relative">
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 z-50 text-slate-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
      >
        &larr; Back to Home
      </button>
      {/* Left Side - Auth */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 z-10 bg-slate-900 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700"
        >
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-400 text-sm">
              {isLogin
                ? 'Sign in to play ranked matches and track your Elo.'
                : 'Create an account to start playing and climbing the leaderboard.'}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                autoComplete={isLogin ? 'email' : 'new-email'}
                disabled={loading}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? '••••••••' : 'Min 6 characters'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  disabled={loading}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors disabled:opacity-50"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLogin ? '🔑 Sign In' : '🚀 Create Account'}
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { navigate(isLogin ? '/register' : '/login'); setError(''); }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Demos */}
      <div className="flex-1 bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-slate-800 p-8 flex flex-col items-center justify-start lg:justify-center gap-8 overflow-y-auto relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-500 rounded-full mix-blend-screen filter blur-[100px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center z-10 mt-8 lg:mt-0"
        >
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Try it out!</h2>
          <p className="text-slate-400">Play a quick match against our random bot before signing in.</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="z-10 w-full flex justify-center"
        >
          <SimpleTicTacToeDemo />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="z-10 w-full flex justify-center pb-8"
        >
          <SuperTicTacToeDemo />
        </motion.div>
      </div>
    </div>
  );
}
