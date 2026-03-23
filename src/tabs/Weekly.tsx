import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Flame, Download, CheckCircle, Clock, Calendar } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { TrackerBlock, ExamProfile } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

export default function Weekly() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [weeklyBlocks, setWeeklyBlocks] = useState<TrackerBlock[]>([]);
  const [examProfile, setExamProfile] = useState<ExamProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(new Date(), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'users', profile.uid, 'tracker'),
      where('date', '>=', format(start, 'yyyy-MM-dd')),
      where('date', '<=', format(end, 'yyyy-MM-dd'))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackerBlock));
      setWeeklyBlocks(data);
      setLoading(false);
    });

    const profileId = profile.currentExamProfileId || 'default';
    const unsubscribeProfile = onSnapshot(doc(db, 'users', profile.uid, 'examProfiles', profileId), (snapshot) => {
      if (snapshot.exists()) {
        setExamProfile(snapshot.data() as ExamProfile);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeProfile();
    };
  }, [profile?.uid, profile?.currentExamProfileId]);

  const getDayProgress = (date: Date) => {
    const dayBlocks = weeklyBlocks.filter(b => b.date === format(date, 'yyyy-MM-dd'));
    if (dayBlocks.length === 0) return 0;
    const done = dayBlocks.filter(b => b.status === 'done').length;
    return Math.round((done / dayBlocks.length) * 100);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('weekly.title')}</h1>
          <p className="text-sm text-text-secondary">
            {format(start, 'MMM do')} - {format(end, 'MMM do, yyyy')}
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2 bg-elevated border border-border rounded-xl font-semibold hover:bg-primary/10 hover:border-primary/50 transition-all">
          <Download size={18} />
          {t('weekly.export_week')}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Progress Grid */}
        <section className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border bg-elevated/50">
            <h2 className="font-semibold">{t('weekly.weekly_grid')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Subject</th>
                  {days.map(day => (
                    <th key={day.toISOString()} className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest text-center">
                      {format(day, 'EEE')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {examProfile?.subjects.map(subject => (
                  <tr key={subject.id} className="border-b border-border hover:bg-elevated/30 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                      <span className="text-sm font-medium">{subject.name}</span>
                    </td>
                    {days.map(day => {
                      const dayBlocks = weeklyBlocks.filter(b => b.date === format(day, 'yyyy-MM-dd') && b.subjectId === subject.id);
                      const done = dayBlocks.length > 0 && dayBlocks.every(b => b.status === 'done');
                      const partial = dayBlocks.length > 0 && dayBlocks.some(b => b.status === 'done') && !done;
                      
                      return (
                        <td key={day.toISOString()} className="p-4 text-center">
                          <div className={`w-6 h-6 mx-auto rounded-md border flex items-center justify-center transition-all ${
                            done ? 'bg-primary border-primary text-white' : 
                            partial ? 'bg-primary/20 border-primary/40' : 
                            'bg-elevated border-border'
                          }`}>
                            {done && <CheckCircle size={14} />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Streaks & Goals */}
        <div className="space-y-8">
          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 text-orange-500">
              <Flame size={20} />
              <h2 className="font-semibold">{t('weekly.streak_calendar')}</h2>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {/* Simple 30-day streak placeholder */}
              {Array.from({ length: 28 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`aspect-square rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    i < 12 ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-elevated border-border text-text-secondary'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('weekly.current_streak')}</span>
                <p className="text-2xl font-bold text-orange-500">{profile?.stats.currentStreak || 0} 🔥</p>
              </div>
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('weekly.best_streak')}</span>
                <p className="text-2xl font-bold text-text-primary">{profile?.stats.bestStreak || 0}</p>
              </div>
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Clock size={20} />
              <h2 className="font-semibold">{t('weekly.weekly_goal')}</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">12 / 40 {t('common.hours')}</span>
                <span className="text-sm font-bold text-primary">30%</span>
              </div>
              <div className="h-2 w-full bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[30%]" />
              </div>
              <button className="w-full py-2 bg-elevated border border-border rounded-xl text-xs font-bold uppercase tracking-widest hover:border-primary/50 transition-all">
                {t('weekly.log_hours')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
