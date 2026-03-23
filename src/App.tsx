import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { I18nProvider } from './i18n';
import Layout from './components/Layout';
import Home from './tabs/Home';
import Setup from './tabs/Setup';
import Routine from './tabs/Routine';
import Tracker from './tabs/Tracker';
import Pomodoro from './tabs/Pomodoro';
import Weekly from './tabs/Weekly';
import Challenge from './tabs/Challenge';
import Leaderboard from './tabs/Leaderboard';
import Flashcards from './tabs/Flashcards';
import Notes from './tabs/Notes';
import Analytics from './tabs/Analytics';
import Profile from './tabs/Profile';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signIn } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-base text-primary font-bold text-2xl">Gyanio</div>;
  if (!user) return <div className="h-screen w-screen flex items-center justify-center bg-base"><button onClick={signIn} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all">Sign In with Google</button></div>;
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <Routes>
              <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
                <Route index element={<Home />} />
                <Route path="setup" element={<Setup />} />
                <Route path="routine" element={<Routine />} />
                <Route path="tracker" element={<Tracker />} />
                <Route path="pomodoro" element={<Pomodoro />} />
                <Route path="weekly" element={<Weekly />} />
                <Route path="challenge" element={<Challenge />} />
                <Route path="challenge/:code" element={<Challenge />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="flashcards" element={<Flashcards />} />
                <Route path="notes" element={<Notes />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
