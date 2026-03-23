import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { useTheme } from '../ThemeContext';
import { User, Award, Settings, LogOut, Trash2, Globe, Moon, Sun, Bell, Volume2, Download, Upload } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format } from 'date-fns';

export default function Profile() {
  const { profile, signOut } = useAuth();
  const { t, lang, changeLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  const stats = [
    { label: t('profile.total_hours'), value: profile?.stats.totalStudyHours.toFixed(1) || '0.0', color: 'text-blue-500' },
    { label: t('profile.tasks_done'), value: profile?.stats.tasksCompleted || 0, color: 'text-red-500' },
    { label: t('profile.challenges_won'), value: profile?.stats.challengesWon || 0, color: 'text-green-500' },
    { label: t('profile.current_streak'), value: profile?.stats.currentStreak || 0, color: 'text-orange-500' },
    { label: t('profile.total_pomodoros'), value: profile?.stats.totalPomodoros || 0, color: 'text-purple-500' },
    { label: t('profile.badges_earned'), value: profile?.stats.totalBadges || 0, color: 'text-yellow-500' },
  ];

  const badges = [
    { id: 'first_step', name: 'First Step', icon: '🌱', condition: 'Complete first study session', earned: true },
    { id: 'on_fire', name: 'On Fire', icon: '🔥', condition: '7-day streak', earned: profile?.stats.currentStreak! >= 7 },
    { id: 'diamond', name: 'Diamond Streak', icon: '💎', condition: '30-day streak', earned: profile?.stats.currentStreak! >= 30 },
    { id: 'early_bird', name: 'Early Bird', icon: '🌅', condition: 'Study before 7am', earned: false },
    { id: 'night_owl', name: 'Night Owl', icon: '🦉', condition: 'Study after 11pm', earned: false },
    { id: 'pomo_master', name: 'Pomodoro Master', icon: '🍅', condition: 'Complete 100 Pomodoros', earned: profile?.stats.totalPomodoros! >= 100 },
  ];

  const updateProfile = async (updates: any) => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, 'users', profile.uid), updates);
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action is irreversible.')) return;
    if (!profile?.uid) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', profile.uid));
      await auth.currentUser?.delete();
    } catch (err) {
      console.error('Failed to delete account', err);
      alert('Please re-authenticate to delete your account.');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    if (!profile?.uid) return;
    const data = {
      profile,
      // We could fetch more data here if needed
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gyanio_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.profile && profile?.uid) {
            await updateDoc(doc(db, 'users', profile.uid), data.profile);
            alert('Data imported successfully!');
          }
        } catch (err) {
          console.error('Import failed', err);
          alert('Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row items-center gap-8 bg-surface border border-border p-8 rounded-3xl">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full bg-primary/20 border-4 border-primary/30 overflow-hidden shadow-2xl">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName}`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all">
            <Settings size={16} />
          </button>
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{profile?.displayName}</h1>
          <p className="text-text-secondary font-medium">{profile?.email}</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
              {t('profile.global_rank')}: #1
            </span>
            <span className="px-3 py-1 rounded-full bg-elevated border border-border text-text-secondary text-xs font-bold uppercase tracking-widest">
              {t('profile.member_since')}: {profile?.createdAt ? format(new Date(profile.createdAt), 'MMM yyyy') : format(new Date(), 'MMM yyyy')}
            </span>
            <span className="px-3 py-1 rounded-full bg-elevated border border-border text-text-secondary text-xs font-bold uppercase tracking-widest">
              {t('notes.last_edited')}: {profile?.updatedAt ? format(new Date(profile.updatedAt), 'HH:mm') : '--:--'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <button onClick={signOut} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500/10 text-red-500 rounded-xl font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
            <LogOut size={18} />
            {t('profile.sign_out')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-surface border border-border p-6 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{stat.label}</span>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </section>

          {/* Badges Section */}
          <section className="bg-surface border border-border rounded-2xl p-8 space-y-8">
            <div className="flex items-center gap-3 text-yellow-500">
              <Award size={24} />
              <h2 className="text-xl font-bold">{t('profile.badges_earned')}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {badges.map((badge) => (
                <div 
                  key={badge.id} 
                  className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                    badge.earned ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-elevated/30 border-border opacity-40 grayscale'
                  }`}
                >
                  <span className="text-4xl mb-3">{badge.icon}</span>
                  <h3 className="text-sm font-bold text-text-primary">{badge.name}</h3>
                  <p className="text-[10px] text-text-secondary font-medium mt-1">{badge.condition}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-8">
          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Settings size={20} />
              <h2 className="font-semibold">Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-text-secondary" />
                  <span className="text-sm font-medium">{t('profile.language')}</span>
                </div>
                <select 
                  value={lang}
                  onChange={(e) => changeLang(e.target.value)}
                  className="bg-elevated border border-border rounded-lg px-3 py-1 text-xs font-bold uppercase outline-none focus:border-primary/50"
                >
                  <option value="en">EN</option>
                  <option value="bn">BN</option>
                  <option value="ar">AR</option>
                  <option value="hi">HI</option>
                  <option value="ur">UR</option>
                  <option value="es">ES</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon size={18} className="text-text-secondary" /> : <Sun size={18} className="text-text-secondary" />}
                  <span className="text-sm font-medium">{t('profile.theme')}</span>
                </div>
                <div className="flex bg-elevated border border-border rounded-lg p-1">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                  >
                    White
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-text-secondary" />
                  <span className="text-sm font-medium">{t('profile.sound_toggle')}</span>
                </div>
                <button className="w-10 h-5 bg-primary rounded-full relative transition-all">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                </button>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-3">
              <button 
                onClick={exportData}
                className="w-full flex items-center justify-between px-4 py-3 bg-elevated border border-border rounded-xl text-sm font-medium hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Download size={18} className="text-text-secondary group-hover:text-primary" />
                  <span>{t('profile.export_data')}</span>
                </div>
              </button>
              <button 
                onClick={importData}
                className="w-full flex items-center justify-between px-4 py-3 bg-elevated border border-border rounded-xl text-sm font-medium hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Upload size={18} className="text-text-secondary group-hover:text-primary" />
                  <span>{t('profile.import_data')}</span>
                </div>
              </button>
            </div>

            <div className="pt-4">
              <button 
                onClick={deleteAccount}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/5 text-red-500 border border-red-500/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 size={16} />
                {t('profile.delete_account')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
