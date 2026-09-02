import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../features/auth/AuthContext';
import { SignInError } from '../lib/firebase';
import { GoogleIcon } from '../components/GoogleIcon';
import { Spinner } from '../components/Spinner';

/**
 * Sign-in screen. Also the landing page — there is nothing to do here without
 * an account, so a separate marketing page would only add a click.
 */
export default function SignInPage() {
  const { status, signIn } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Preserve an invite link through sign-in so the player lands in the game.
  const next = params.get('next');

  if (status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-900">
        <Spinner label="Checking your session" />
      </main>
    );
  }

  if (status === 'signed-in') {
    return <Navigate to={next ?? '/play'} replace />;
  }

  if (status === 'unconfigured') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-900 p-6">
        <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-slate-100">Not configured yet</h1>
          <p className="text-sm text-slate-400">
            This deployment is missing its Firebase settings, so sign-in is unavailable.
            See <code className="text-indigo-300">.env.example</code> in the repository for the
            values it needs.
          </p>
        </div>
      </main>
    );
  }

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      // A cancelled popup is a normal thing to do, not an error worth shouting about.
      if (err instanceof SignInError && err.kind === 'cancelled') {
        setError(null);
      } else if (err instanceof SignInError) {
        setError(err.message);
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-900 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm text-center"
      >
        <div className="mb-8">
          <MiniBoardMark />
        </div>

        <h1 className="ttt-display mb-3 text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
          Super Tic-Tac-Toe
        </h1>
        <p className="mx-auto mb-10 max-w-xs text-balance text-sm leading-relaxed text-slate-400">
          Nine boards inside one. Where you play decides where your opponent must play next.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="group flex w-full items-center justify-center gap-3 rounded-xl bg-slate-100 px-5 py-3.5 font-semibold text-slate-900 shadow-lg transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-60"
        >
          {busy ? <Spinner size="sm" inline /> : <GoogleIcon />}
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}

        <p className="mt-8 text-xs text-slate-500">
          We use your Google account for your name and picture. Nothing is posted on your behalf.
        </p>
      </motion.div>
    </main>
  );
}

/** A small decorative board that hints at the game's structure. */
function MiniBoardMark() {
  const filled: Record<number, 'X' | 'O'> = { 0: 'X', 4: 'O', 8: 'X', 2: 'O', 6: 'X' };
  return (
    <div
      aria-hidden="true"
      className="mx-auto grid w-24 grid-cols-3 gap-1 rounded-xl border border-slate-700 bg-slate-800 p-2"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.04, type: 'spring', stiffness: 260, damping: 18 }}
          className={
            'flex h-6 items-center justify-center rounded text-xs font-black ' +
            (filled[i] === 'X'
              ? 'bg-indigo-500/25 text-indigo-200'
              : filled[i] === 'O'
                ? 'bg-rose-500/25 text-rose-200'
                : 'bg-slate-700/40')
          }
        >
          {filled[i] ?? ''}
        </motion.div>
      ))}
    </div>
  );
}
