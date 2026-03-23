import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { CheckCircle, XCircle, Clock, RotateCcw, Download } from 'lucide-react';
import { doc, onSnapshot, collection, query, where, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TrackerBlock, ExamProfile } from '../types';
import { format } from 'date-fns';
import { updateStudyStats, updateStreak } from '../services/statsService';

export default function Tracker() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [blocks, setBlocks] = useState<TrackerBlock[]>([]);
  const [examProfile, setExamProfile] = useState<ExamProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'users', profile.uid, 'tracker'),
      where('date', '==', today)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackerBlock));
      setBlocks(data.sort((a, b) => a.startTime.localeCompare(b.startTime)));
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

  const updateStatus = async (id: string, status: 'pending' | 'done' | 'skipped') => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, 'users', profile.uid, 'tracker', id), { status });
    
    if (status === 'done') {
      await updateStudyStats(profile.uid, 60); // Assume 60 mins per block
      await updateStreak(profile.uid);
    }
  };

  const resetAll = async () => {
    if (!profile?.uid || blocks.length === 0) return;
    const batch = writeBatch(db);
    blocks.forEach(block => {
      batch.update(doc(db, 'users', profile.uid, 'tracker', block.id), { status: 'pending' });
    });
    await batch.commit();
  };

  const markAllDone = async () => {
    if (!profile?.uid || blocks.length === 0) return;
    const batch = writeBatch(db);
    blocks.forEach(block => {
      batch.update(doc(db, 'users', profile.uid, 'tracker', block.id), { status: 'done' });
    });
    await batch.commit();
  };

  const getProgress = () => {
    if (blocks.length === 0) return 0;
    const done = blocks.filter(b => b.status === 'done').length;
    return Math.round((done / blocks.length) * 100);
  };

  const downloadTracker = () => {
    if (blocks.length === 0) return;
    const csvContent = [
      ['Start Time', 'End Time', 'Type', 'Subject', 'Status'],
      ...blocks.map(b => {
        const subject = examProfile?.subjects.find(s => s.id === b.subjectId);
        return [b.startTime, b.endTime, b.type, b.type === 'study' ? subject?.name || 'Study' : b.type, b.status];
      })
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tracker_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('tracker.title')}</h1>
          <p className="text-sm text-text-secondary">Track your progress for {format(new Date(), 'MMMM do, yyyy')}.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={resetAll}
            className="p-2 rounded-lg bg-elevated border border-border text-text-secondary hover:text-red-500 transition-all"
            title={t('tracker.reset')}
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={markAllDone}
            className="px-6 py-2 bg-elevated border border-border rounded-xl font-semibold hover:bg-primary/10 hover:border-primary/50 transition-all"
          >
            {t('tracker.mark_all_done')}
          </button>
          <button 
            onClick={downloadTracker}
            className="p-2 rounded-lg bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
          >
            <Download size={20} />
          </button>
        </div>
      </header>

      {/* Progress Section */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('tracker.progress')}</h2>
          <span className="text-2xl font-bold text-primary">{getProgress()}%</span>
        </div>
        <div className="h-3 w-full bg-elevated rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${getProgress()}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-2 h-2 rounded-full bg-primary" />
            {blocks.filter(b => b.status === 'done').length} {t('tracker.done')}
          </div>
          <div className="flex items-center gap-2 text-red-500">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            {blocks.filter(b => b.status === 'skipped').length} {t('tracker.skipped')}
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-text-secondary" />
            {blocks.filter(b => b.status === 'pending').length} {t('tracker.pending')}
          </div>
        </div>
      </section>

      {blocks.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {blocks.map((block) => {
            const subject = examProfile?.subjects.find(s => s.id === block.subjectId);
            return (
              <div 
                key={block.id} 
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  block.status === 'done' ? 'bg-primary/10 border-primary/30 opacity-70' : 
                  block.status === 'skipped' ? 'bg-red-500/10 border-red-500/30 opacity-70' :
                  'bg-surface border-border'
                }`}
              >
                <div className="w-20 font-mono text-sm font-bold text-text-secondary">
                  {block.startTime}
                </div>
                <div className="flex-1 flex flex-col">
                  <span className={`font-bold text-text-primary capitalize ${block.status !== 'pending' ? 'line-through' : ''}`}>
                    {block.type === 'study' ? subject?.name || 'Study' : block.type}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {block.startTime} - {block.endTime}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateStatus(block.id, block.status === 'done' ? 'pending' : 'done')}
                    className={`p-2 rounded-lg transition-all ${
                      block.status === 'done' ? 'bg-primary text-white' : 'bg-elevated text-text-secondary hover:text-primary'
                    }`}
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button 
                    onClick={() => updateStatus(block.id, block.status === 'skipped' ? 'pending' : 'skipped')}
                    className={`p-2 rounded-lg transition-all ${
                      block.status === 'skipped' ? 'bg-red-500 text-white' : 'bg-elevated text-text-secondary hover:text-red-500'
                    }`}
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center text-text-secondary">
            <Clock size={40} />
          </div>
          <div className="space-y-1">
            <p className="text-text-primary font-medium">{t('tracker.no_blocks')}</p>
            <p className="text-sm text-text-secondary">Generate your routine and apply it to today to start tracking.</p>
          </div>
        </div>
      )}
    </div>
  );
}
