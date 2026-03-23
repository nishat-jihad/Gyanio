import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Clock, Flame, Trophy, Timer, Award, Sword, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-surface border border-border p-4 rounded-2xl flex flex-col gap-2">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
      <Icon size={20} className={color.replace('bg-', 'text-')} />
    </div>
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-text-primary">{value}</span>
      <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">{label}</span>
    </div>
  </div>
);

export default function Home() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const now = new Date();

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return t('home.greeting_morning');
    if (hour < 18) return t('home.greeting_afternoon');
    return t('home.greeting_evening');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {profile?.displayName?.split(' ')[0]}! 📚
          </h1>
          <div className="flex items-center gap-2 text-text-secondary font-medium">
            <Clock size={16} />
            <span className="font-mono">{format(now, 'HH:mm')}</span>
            <span>•</span>
            <span>{format(now, 'EEEE, MMMM do')}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Clock} label={t('home.todays_hours')} value="0.0" color="bg-blue-500" />
        <StatCard icon={Flame} label={t('home.streak')} value={profile?.stats.currentStreak || 0} color="bg-orange-500" />
        <StatCard icon={Trophy} label={t('home.rank')} value="#--" color="bg-yellow-500" />
        <StatCard icon={Timer} label={t('home.pomodoros')} value={profile?.stats.totalPomodoros || 0} color="bg-red-500" />
        <StatCard icon={Award} label={t('home.badges')} value={profile?.stats.totalBadges || 0} color="bg-purple-500" />
        <StatCard icon={Sword} label="Challenges" value="0" color="bg-cyan-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Sessions */}
          <section className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">{t('home.upcoming_sessions')}</h2>
              <button className="text-xs text-primary font-bold uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center text-text-secondary">
                <Calendar size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-text-primary font-medium">{t('home.no_sessions')}</p>
                <p className="text-sm text-text-secondary">Start by setting up your exam and routine.</p>
              </div>
              <button className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:scale-105 transition-all">
                {t('nav.setup')}
              </button>
            </div>
          </section>

          {/* Weekly Progress Chart Placeholder */}
          <section className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold">{t('home.weekly_progress')}</h2>
            <div className="h-48 w-full bg-elevated rounded-xl flex items-end justify-between p-4 gap-2">
              {[40, 70, 30, 90, 50, 20, 60].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-primary/20 rounded-t-md relative group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      className="w-full bg-primary rounded-t-md"
                    />
                  </div>
                  <span className="text-[10px] text-text-secondary font-bold uppercase">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Sidebar Widgets */}
          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Flashcards Due</h3>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">0</span>
                <button className="px-4 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-accent/20 transition-all">Review</button>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Revisions Today</h3>
              <p className="text-sm text-text-secondary italic">No revisions scheduled for today.</p>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Recent Badge</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                  <Award size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">First Step</span>
                  <span className="text-xs text-text-secondary">Complete your first session</span>
                </div>
              </div>
            </div>
          </section>

          {/* Motivation Quote */}
          <section className="bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 rounded-2xl p-6">
            <p className="text-lg font-medium italic text-text-primary leading-relaxed">
              "The secret of getting ahead is getting started."
            </p>
            <p className="text-sm text-text-secondary mt-4">— Mark Twain</p>
          </section>
        </div>
      </div>
    </div>
  );
}
