import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Plus, Trash2, Save, Calendar, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { doc, setDoc, collection, onSnapshot, query, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamProfile, Subject, Task } from '../types';

export default function Setup() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [sessionLength, setSessionLength] = useState(60);
  const [breakDuration, setBreakDuration] = useState(10);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const profileId = profile.currentExamProfileId || 'default';
    const unsubscribe = onSnapshot(doc(db, 'users', profile.uid, 'examProfiles', profileId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ExamProfile;
        setExamName(data.name || '');
        setExamDate(data.date || '');
        setWakeTime(data.wakeTime || '07:00');
        setSleepTime(data.sleepTime || '23:00');
        setSessionLength(data.sessionLength || 60);
        setBreakDuration(data.breakDuration || 10);
        setSubjects(data.subjects || []);
        setTasks(data.tasks || []);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile?.uid, profile?.currentExamProfileId]);

  const saveProfile = async () => {
    if (!profile?.uid) return;
    const profileId = profile.currentExamProfileId || 'default';
    const data: Partial<ExamProfile> = {
      name: examName,
      date: examDate,
      wakeTime,
      sleepTime,
      sessionLength,
      breakDuration,
      subjects,
      tasks,
    };
    await setDoc(doc(db, 'users', profile.uid, 'examProfiles', profileId), data, { merge: true });
    if (!profile.currentExamProfileId) {
      await setDoc(doc(db, 'users', profile.uid), { currentExamProfileId: profileId }, { merge: true });
    }
  };

  const addSubject = () => {
    const newSubject: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      priority: 'medium',
      color: '#7c3aed',
    };
    setSubjects([...subjects, newSubject]);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const addTask = () => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      startTime: '12:00',
      endTime: '13:00',
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.setup')}</h1>
          <p className="text-sm text-text-secondary">Configure your exam details and daily schedule.</p>
        </div>
        <button 
          onClick={saveProfile}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Save size={18} />
          {t('common.save')}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Exam Details */}
        <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <Calendar size={20} />
            <h2 className="font-semibold">Exam Details</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('setup.exam_name')}</label>
              <input 
                type="text" 
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. IELTS Academic"
                className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('setup.exam_date')}</label>
              <input 
                type="date" 
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 transition-all outline-none"
              />
            </div>
          </div>
        </section>

        {/* Daily Schedule */}
        <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 text-accent">
            <Clock size={20} />
            <h2 className="font-semibold">Daily Schedule</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('setup.wake_time')}</label>
              <input 
                type="time" 
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('setup.sleep_time')}</label>
              <input 
                type="time" 
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('setup.session_length')}</label>
              <input 
                type="number" 
                value={sessionLength}
                onChange={(e) => setSessionLength(parseInt(e.target.value))}
                className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('setup.break_duration')}</label>
              <input 
                type="number" 
                value={breakDuration}
                onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 transition-all outline-none"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Subjects */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <BookOpen size={20} />
            <h2 className="font-semibold">{t('setup.add_subject')}</h2>
          </div>
          <button 
            onClick={addSubject}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="space-y-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center gap-3 bg-elevated p-3 rounded-xl border border-border group">
              <input 
                type="color" 
                value={subject.color}
                onChange={(e) => updateSubject(subject.id, { color: e.target.value })}
                className="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer"
              />
              <input 
                type="text" 
                value={subject.name}
                onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                placeholder={t('setup.subject_name')}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <select 
                value={subject.priority}
                onChange={(e) => updateSubject(subject.id, { priority: e.target.value as any })}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-xs font-bold uppercase"
              >
                <option value="low">{t('setup.priority_low')}</option>
                <option value="medium">{t('setup.priority_medium')}</option>
                <option value="high">{t('setup.priority_high')}</option>
              </select>
              <button 
                onClick={() => removeSubject(subject.id)}
                className="p-2 text-text-secondary hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {subjects.length === 0 && (
            <div className="text-center py-8 text-text-secondary text-sm italic">
              No subjects added yet. Add subjects to generate your routine.
            </div>
          )}
        </div>
      </section>

      {/* Non-Study Tasks */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle size={20} />
            <h2 className="font-semibold">Non-Study Tasks</h2>
          </div>
          <button 
            onClick={addTask}
            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 bg-elevated p-3 rounded-xl border border-border group">
              <input 
                type="text" 
                value={task.name}
                onChange={(e) => updateTask(task.id, { name: e.target.value })}
                placeholder={t('setup.task_name')}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  value={task.startTime}
                  onChange={(e) => updateTask(task.id, { startTime: e.target.value })}
                  className="bg-surface border border-border rounded-lg px-2 py-1 text-xs"
                />
                <span className="text-text-secondary text-xs">to</span>
                <input 
                  type="time" 
                  value={task.endTime}
                  onChange={(e) => updateTask(task.id, { endTime: e.target.value })}
                  className="bg-surface border border-border rounded-lg px-2 py-1 text-xs"
                />
              </div>
              <button 
                onClick={() => removeTask(task.id)}
                className="p-2 text-text-secondary hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-text-secondary text-sm italic">
              No non-study tasks added yet (e.g. Lunch, Gym, Commute).
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
