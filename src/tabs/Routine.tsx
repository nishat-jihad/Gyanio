import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Calendar, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { doc, onSnapshot, setDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamProfile, RoutineBlock, TrackerBlock } from '../types';
import { format, parse, addMinutes, isBefore, isAfter, differenceInMinutes } from 'date-fns';

export default function Routine() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [examProfile, setExamProfile] = useState<ExamProfile | null>(null);
  const [routine, setRoutine] = useState<RoutineBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const profileId = profile.currentExamProfileId || 'default';
    const unsubscribe = onSnapshot(doc(db, 'users', profile.uid, 'examProfiles', profileId), (snapshot) => {
      if (snapshot.exists()) {
        setExamProfile(snapshot.data() as ExamProfile);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile?.uid, profile?.currentExamProfileId]);

  const generateRoutine = () => {
    if (!examProfile) return;

    const { wakeTime, sleepTime, sessionLength, breakDuration, subjects, tasks } = examProfile;
    if (subjects.length === 0) return;

    const newRoutine: RoutineBlock[] = [];
    let currentTime = parse(wakeTime, 'HH:mm', new Date());
    const endTime = parse(sleepTime, 'HH:mm', new Date());

    // Sort tasks by start time
    const sortedTasks = [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Subject distribution queue based on priority
    const subjectQueue: string[] = [];
    subjects.forEach(s => {
      const count = s.priority === 'high' ? 3 : s.priority === 'medium' ? 2 : 1;
      for (let i = 0; i < count; i++) subjectQueue.push(s.id);
    });
    let subjectIndex = 0;

    while (isBefore(currentTime, endTime)) {
      // Check if current time is within a task
      const activeTask = sortedTasks.find(t => {
        const taskStart = parse(t.startTime, 'HH:mm', new Date());
        const taskEnd = parse(t.endTime, 'HH:mm', new Date());
        return (isAfter(currentTime, taskStart) || currentTime.getTime() === taskStart.getTime()) && isBefore(currentTime, taskEnd);
      });

      if (activeTask) {
        const taskEnd = parse(activeTask.endTime, 'HH:mm', new Date());
        newRoutine.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'task',
          startTime: format(currentTime, 'HH:mm'),
          endTime: activeTask.endTime,
          duration: differenceInMinutes(taskEnd, currentTime)
        });
        currentTime = taskEnd;
        continue;
      }

      // Check for next task to see if we have enough time for a session
      const nextTask = sortedTasks.find(t => isAfter(parse(t.startTime, 'HH:mm', new Date()), currentTime));
      const nextLimit = nextTask ? parse(nextTask.startTime, 'HH:mm', new Date()) : endTime;
      const availableMins = differenceInMinutes(nextLimit, currentTime);

      if (availableMins >= sessionLength) {
        // Add study session
        const sessionEnd = addMinutes(currentTime, sessionLength);
        newRoutine.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'study',
          subjectId: subjectQueue[subjectIndex % subjectQueue.length],
          startTime: format(currentTime, 'HH:mm'),
          endTime: format(sessionEnd, 'HH:mm'),
          duration: sessionLength
        });
        subjectIndex++;
        currentTime = sessionEnd;

        // Add break if there's time
        if (differenceInMinutes(nextLimit, currentTime) >= breakDuration) {
          const breakEnd = addMinutes(currentTime, breakDuration);
          newRoutine.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'break',
            startTime: format(currentTime, 'HH:mm'),
            endTime: format(breakEnd, 'HH:mm'),
            duration: breakDuration
          });
          currentTime = breakEnd;
        }
      } else {
        // Free time or small gap
        newRoutine.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'free',
          startTime: format(currentTime, 'HH:mm'),
          endTime: format(nextLimit, 'HH:mm'),
          duration: availableMins
        });
        currentTime = nextLimit;
      }
    }

    setRoutine(newRoutine);
  };

  const applyToToday = async () => {
    if (!profile?.uid || routine.length === 0) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const batch = writeBatch(db);
    
    routine.forEach(block => {
      const trackerRef = doc(collection(db, 'users', profile.uid, 'tracker'));
      const trackerBlock: TrackerBlock = {
        id: trackerRef.id,
        blockId: block.id,
        date: today,
        status: 'pending',
        type: block.type,
        subjectId: block.subjectId,
        startTime: block.startTime,
        endTime: block.endTime
      };
      batch.set(trackerRef, trackerBlock);
    });

    await batch.commit();
    alert('Routine applied to Today\'s Tracker!');
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('routine.title')}</h1>
          <p className="text-sm text-text-secondary">Your algorithmically generated study schedule.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={generateRoutine}
            className="px-6 py-2 bg-elevated border border-border rounded-xl font-semibold hover:bg-primary/10 hover:border-primary/50 transition-all"
          >
            {t('setup.generate_routine')}
          </button>
          <button 
            onClick={applyToToday}
            disabled={routine.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <CheckCircle size={18} />
            {t('routine.apply_today')}
          </button>
        </div>
      </header>

      {routine.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {routine.map((block) => {
              const subject = examProfile?.subjects.find(s => s.id === block.subjectId);
              return (
                <div 
                  key={block.id} 
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    block.type === 'study' ? 'bg-primary/5 border-primary/20' : 
                    block.type === 'task' ? 'bg-red-500/5 border-red-500/20' :
                    block.type === 'break' ? 'bg-yellow-500/5 border-yellow-500/20' :
                    'bg-elevated border-border'
                  }`}
                >
                  <div className="w-20 font-mono text-sm font-bold text-text-secondary">
                    {block.startTime}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="font-bold text-text-primary capitalize">
                      {block.type === 'study' ? subject?.name || 'Study' : block.type}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {block.duration} {t('setup.minutes')}
                    </span>
                  </div>
                  {block.type === 'study' && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: subject?.color || 'var(--primary)' }} 
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-surface border border-border p-4 rounded-2xl">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">{t('routine.total_study')}</span>
              <p className="text-xl font-bold text-primary">{routine.filter(b => b.type === 'study').reduce((acc, b) => acc + b.duration, 0)}m</p>
            </div>
            <div className="bg-surface border border-border p-4 rounded-2xl">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">{t('routine.total_break')}</span>
              <p className="text-xl font-bold text-yellow-500">{routine.filter(b => b.type === 'break').reduce((acc, b) => acc + b.duration, 0)}m</p>
            </div>
            <div className="bg-surface border border-border p-4 rounded-2xl">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">{t('routine.total_task')}</span>
              <p className="text-xl font-bold text-red-500">{routine.filter(b => b.type === 'task').reduce((acc, b) => acc + b.duration, 0)}m</p>
            </div>
            <div className="bg-surface border border-border p-4 rounded-2xl">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">{t('routine.free')}</span>
              <p className="text-xl font-bold text-text-secondary">{routine.filter(b => b.type === 'free').reduce((acc, b) => acc + b.duration, 0)}m</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center text-text-secondary">
            <Calendar size={40} />
          </div>
          <div className="space-y-1">
            <p className="text-text-primary font-medium">No routine generated yet.</p>
            <p className="text-sm text-text-secondary">Click the button above to generate your schedule based on your setup.</p>
          </div>
        </div>
      )}
    </div>
  );
}
