import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Play, Pause, RotateCcw, SkipForward, Maximize2, X } from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import confetti from 'canvas-confetti';
import { updateStudyStats, updateStreak } from '../services/statsService';

export default function Pomodoro() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [sessions, setSessions] = useState(0);
  const [focusLock, setFocusLock] = useState(false);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const durations = {
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  useEffect(() => {
    drawProgress();
  }, [timeLeft, mode]);

  const drawProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const progress = 1 - (timeLeft / durations[mode]);

    ctx.clearRect(0, 0, size, size);

    // Background circle
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Progress arc
    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI / 2, (-Math.PI / 2) + (2 * Math.PI * progress));
    ctx.strokeStyle = mode === 'focus' ? '#7c3aed' : mode === 'short' ? '#06b6d4' : '#f59e0b';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const handleComplete = async () => {
    setIsActive(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#7c3aed', '#06b6d4', '#ffffff']
    });

    if (mode === 'focus') {
      setSessions(prev => prev + 1);
      if (profile?.uid) {
        await updateStudyStats(profile.uid, 25);
        await updateStreak(profile.uid);
        await updateDoc(doc(db, 'users', profile.uid), {
          'stats.totalPomodoros': increment(1)
        });
      }
      if (sessions + 1 >= 4) {
        setMode('long');
        setTimeLeft(durations.long);
        setSessions(0);
      } else {
        setMode('short');
        setTimeLeft(durations.short);
      }
    } else {
      setMode('focus');
      setTimeLeft(durations.focus);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(durations[mode]);
  };

  const skipSession = () => {
    resetTimer();
    // Notification logic could go here
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const enterFocusLock = () => {
    setFocusLock(true);
    document.documentElement.requestFullscreen();
  };

  const exitFocusLock = () => {
    setFocusLock(false);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  return (
    <div className={`max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-120px)] space-y-12 ${focusLock ? 'fixed inset-0 z-[100] bg-base p-12' : ''}`}>
      {focusLock && (
        <button 
          onClick={exitFocusLock}
          className="absolute top-8 right-8 p-2 rounded-full bg-elevated text-text-secondary hover:text-red-500 transition-all"
        >
          <X size={24} />
        </button>
      )}

      <div className="flex items-center gap-2 p-1 bg-elevated rounded-2xl border border-border">
        {(['focus', 'short', 'long'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setTimeLeft(durations[m]);
              setIsActive(false);
            }}
            className={`px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
              mode === m ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(`pomodoro.${m === 'focus' ? 'focus' : m === 'short' ? 'short_break' : 'long_break'}`)}
          </button>
        ))}
      </div>

      <div className="relative w-80 h-80 flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={320} 
          height={320} 
          className="absolute inset-0"
        />
        <div className="flex flex-col items-center gap-1">
          <span className="text-6xl font-mono font-bold tracking-tighter text-text-primary">
            {formatTime(timeLeft)}
          </span>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em]">
            {mode === 'focus' ? 'Focusing' : 'Resting'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={resetTimer}
          className="p-4 rounded-2xl bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
        >
          <RotateCcw size={24} />
        </button>
        <button 
          onClick={toggleTimer}
          className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
        >
          {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>
        <button 
          onClick={skipSession}
          className="p-4 rounded-2xl bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
        >
          <SkipForward size={24} />
        </button>
      </div>

      {!focusLock && (
        <button 
          onClick={enterFocusLock}
          className="flex items-center gap-2 px-8 py-3 bg-elevated border border-border rounded-2xl text-sm font-bold uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all group"
        >
          <Maximize2 size={18} className="group-hover:scale-110 transition-transform" />
          {t('pomodoro.enter_focus_lock')}
        </button>
      )}

      <div className="grid grid-cols-2 gap-8 w-full max-w-md">
        <div className="bg-surface border border-border p-6 rounded-2xl text-center space-y-1">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('pomodoro.sessions_today')}</span>
          <p className="text-2xl font-bold text-text-primary">{sessions}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-2xl text-center space-y-1">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('pomodoro.focus_minutes')}</span>
          <p className="text-2xl font-bold text-text-primary">{sessions * 25}</p>
        </div>
      </div>
    </div>
  );
}
