/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import LobbyPage from './pages/LobbyPage';
import GameRoomPage from './pages/GameRoomPage';
import SummaryPage from './pages/SummaryPage';
import OnboardingPage from './pages/OnboardingPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import ReviewPage from './pages/ReviewPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  
  if (!profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }

  if (profile && location.pathname === '/onboarding') {
    return <Navigate to="/lobby" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
            <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
            <Route path="/profile/:uid" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/play/:matchId" element={<ProtectedRoute><GameRoomPage /></ProtectedRoute>} />
            <Route path="/summary/:matchId" element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
            <Route path="/review/:matchId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
