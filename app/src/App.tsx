import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { ThemeProvider } from './features/theme/ThemeContext';
import SignInPage from './pages/SignInPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LivePage from './pages/LivePage';
import ProfilePage from './pages/ProfilePage';
import { Spinner } from './components/Spinner';

/**
 * Gate for signed-in routes.
 *
 * While auth is resolving this renders a spinner rather than the signed-out
 * view, so a reload never flashes the sign-in screen at an authenticated player.
 * An invite link is preserved through sign-in via the `next` parameter.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-900">
        <Spinner label="Signing you in" />
      </main>
    );
  }

  if (status !== 'signed-in') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?next=${next}`} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SignInPage />} />
            <Route
              path="/play"
              element={
                <RequireAuth>
                  <LobbyPage />
                </RequireAuth>
              }
            />
            <Route
              path="/play/:matchId"
              element={
                <RequireAuth>
                  <GamePage />
                </RequireAuth>
              }
            />
            <Route
              path="/live"
              element={
                <RequireAuth>
                  <LivePage />
                </RequireAuth>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <RequireAuth>
                  <LeaderboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/me"
              element={
                <RequireAuth>
                  <ProfilePage self />
                </RequireAuth>
              }
            />
            <Route
              path="/players/:uid"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
