import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth, saveLocalProfile, UserProfile } from '../AuthContext';

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError('Username must be between 3 and 20 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setLoading(true);
    setError('');

    const newProfile: UserProfile = {
      username: trimmed,
      email: user.email || '',
      elo_rating: 1200,
      avg_accuracy: 0,
      matches_played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      created_at: Date.now()
    };

    try {
      saveLocalProfile(user.uid, newProfile);
      // Dispatch event so AuthContext picks up the profile change
      window.dispatchEvent(new Event('profile-updated'));
      // Reload to ensure AuthContext re-reads the profile
      window.location.href = '/lobby';
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700"
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎮</div>
          <h1 className="text-3xl font-bold text-white mb-2">Choose a Username</h1>
          <p className="text-slate-400">This is how other players will see you.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-400 mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. grandmaster_99"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1.5">3-20 characters. Letters, numbers, underscores only.</p>
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              '🚀 Start Playing'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
