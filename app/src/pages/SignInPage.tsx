import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { SignInError } from '../lib/firebase';
import { GoogleIcon } from '../components/GoogleIcon';
import { Spinner } from '../components/Spinner';
import { ClassicDemo, UltimateDemo } from '../features/demo/DemoBoards';

/**
 * Sign-in, and the only Persuade-mode page in the app.
 *
 * A visitor who has never met Ultimate Tic-Tac-Toe cannot be talked into it, so
 * the page shows both games side by side and lets them play. The rule explains
 * itself in about two moves.
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
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner label="Checking your session" />
      </main>
    );
  }

  if (status === 'signed-in') return <Navigate to={next ?? '/play'} replace />;

  if (status === 'unconfigured') {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="ttt-display mb-2 text-xl font-semibold text-slate-100">
            Not configured yet
          </h1>
          <p className="text-sm text-slate-400">
            This deployment is missing its Firebase settings, so sign-in is unavailable. See{' '}
            <code className="ttt-notation text-indigo-300">.env.example</code> in the repository for
            the values it needs.
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
      // Closing the popup is a normal thing to do, not an error worth shouting about.
      if (err instanceof SignInError && err.kind === 'cancelled') setError(null);
      else if (err instanceof SignInError) setError(err.message);
      else setError('Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-10 px-5 py-10 lg:flex-row lg:items-center lg:gap-14">
      {/* The pitch */}
      <div className="lg:flex-1">
        <p className="ttt-notation mb-4 text-xs tracking-[0.25em] text-indigo-300 uppercase">
          Nine boards, one game
        </p>

        <h1 className="ttt-display mb-5 text-4xl leading-[1.05] font-semibold text-slate-100 sm:text-5xl">
          Super
          <br />
          Tic-Tac-Toe
        </h1>

        <p className="mb-2 max-w-md text-base leading-relaxed text-slate-300">
          Every square you take decides which board your opponent has to play in next.
        </p>
        <p className="mb-8 max-w-md text-sm leading-relaxed text-slate-400">
          So a winning move can hand your opponent the board they wanted. That is the whole game.
          Try both below, then play a friend.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="flex w-full max-w-sm items-center justify-center gap-3 rounded-lg bg-indigo-600 px-5 py-3.5 font-semibold text-slate-900 transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:opacity-60 motion-reduce:hover:scale-100"
        >
          {busy ? <Spinner size="sm" inline label="Opening Google" /> : <GoogleIcon />}
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>

        {error && (
          <p role="alert" className="mt-4 max-w-sm text-sm text-red-300">
            {error}
          </p>
        )}

        <p className="mt-6 max-w-sm text-xs leading-relaxed text-slate-500">
          Your Google account supplies your name and picture. Nothing is posted on your behalf.
        </p>
      </div>

      {/* Try it. No account needed. */}
      <div className="lg:flex-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <ClassicDemo />
          <UltimateDemo />
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          Both are live. Play them without signing in.
        </p>
      </div>
    </main>
  );
}
