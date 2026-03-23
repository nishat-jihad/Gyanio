import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Trophy, Clock, Flame, Timer, Award, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { LeaderboardEntry } from '../types';

export default function Leaderboard() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [category, setCategory] = useState('study_hours');
  const [timeframe, setTimeframe] = useState('all_time');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'study_hours', icon: Clock, label: t('leaderboard.study_hours'), color: 'text-blue-500' },
    { id: 'champions', icon: Trophy, label: t('leaderboard.champions'), color: 'text-yellow-500' },
    { id: 'streak_kings', icon: Flame, label: t('leaderboard.streak_kings'), color: 'text-orange-500' },
    { id: 'pomodoro_masters', icon: Timer, label: t('leaderboard.pomodoro_masters'), color: 'text-red-500' },
    { id: 'badge_collectors', icon: Award, label: t('leaderboard.badge_collectors'), color: 'text-purple-500' },
  ];

  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard'),
      where('category', '==', category),
      orderBy('score', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaderboardEntry));
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [category]);

  const filteredEntries = entries.filter(e => 
    e.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const top3 = filteredEntries.slice(0, 3);
  const remaining = filteredEntries.slice(3);

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('leaderboard.title')}</h1>
          <p className="text-sm text-text-secondary">Compete with students worldwide.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('leaderboard.search_user')}
              className="pl-10 pr-4 py-2 bg-elevated border border-border rounded-xl text-sm outline-none focus:border-primary/50 w-64"
            />
          </div>
          <div className="flex bg-elevated border border-border rounded-xl p-1">
            {['all_time', 'this_week', 'today'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  timeframe === tf ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t(`leaderboard.${tf}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all shrink-0 ${
              category === cat.id ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text-secondary hover:bg-elevated hover:text-text-primary'
            }`}
          >
            <cat.icon size={18} />
            <span className="text-sm font-bold uppercase tracking-widest whitespace-nowrap">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-12">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="bg-surface border border-border p-6 rounded-3xl text-center space-y-4 relative h-64 flex flex-col justify-center order-2 md:order-1">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <div className="w-20 h-20 rounded-full border-4 border-slate-400 overflow-hidden bg-elevated">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].displayName}`} alt={top3[1].displayName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-bold px-3 py-1 rounded-full">2nd</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">{top3[1].displayName}</h3>
              <p className="text-2xl font-black text-slate-400">{top3[1].score}</p>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <div className="bg-surface border-2 border-yellow-500/50 p-8 rounded-3xl text-center space-y-4 relative h-80 flex flex-col justify-center order-1 md:order-2 shadow-2xl shadow-yellow-500/10">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
              <div className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden bg-elevated">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].displayName}`} alt={top3[0].displayName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-sm font-bold px-4 py-1 rounded-full">1st</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-xl">{top3[0].displayName}</h3>
              <p className="text-4xl font-black text-yellow-500">{top3[0].score}</p>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="bg-surface border border-border p-6 rounded-3xl text-center space-y-4 relative h-56 flex flex-col justify-center order-3">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <div className="w-20 h-20 rounded-full border-4 border-orange-400 overflow-hidden bg-elevated">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].displayName}`} alt={top3[2].displayName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full">3rd</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">{top3[2].displayName}</h3>
              <p className="text-2xl font-black text-orange-400">{top3[2].score}</p>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <section className="bg-surface border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-elevated/50">
              <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest w-20">{t('leaderboard.rank')}</th>
              <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest">{t('leaderboard.user')}</th>
              <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest text-right">{t('leaderboard.score')}</th>
              <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest w-32 text-center">Change</th>
            </tr>
          </thead>
          <tbody>
            {remaining.map((entry, i) => (
              <tr key={entry.id} className={`border-b border-border hover:bg-elevated/30 transition-colors ${entry.uid === profile?.uid ? 'bg-primary/5' : ''}`}>
                <td className="p-4 font-mono font-bold text-text-secondary">#{i + 4}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-elevated overflow-hidden border border-border">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.displayName}`} alt={entry.displayName} />
                    </div>
                    <span className="text-sm font-semibold">{entry.displayName}</span>
                    {entry.uid === profile?.uid && <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded uppercase">You</span>}
                  </div>
                </td>
                <td className="p-4 text-right font-bold text-text-primary">{entry.score}</td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase">
                    {i % 3 === 0 ? (
                      <div className="flex items-center gap-1 text-green-500"><TrendingUp size={12} /> 2</div>
                    ) : i % 3 === 1 ? (
                      <div className="flex items-center gap-1 text-red-500"><TrendingDown size={12} /> 1</div>
                    ) : (
                      <div className="flex items-center gap-1 text-text-secondary"><Minus size={12} /></div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
