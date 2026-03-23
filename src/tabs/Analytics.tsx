import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { BarChart2, PieChart, TrendingUp, Calendar, Clock, Award, Activity } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { TrackerBlock, ExamProfile } from '../types';
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';

export default function Analytics() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [blocks, setBlocks] = useState<TrackerBlock[]>([]);
  const [examProfile, setExamProfile] = useState<ExamProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pieRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'users', profile.uid, 'tracker'),
      where('date', '>=', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackerBlock));
      setBlocks(data);
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

  useEffect(() => {
    if (!loading && blocks.length > 0) {
      drawBarChart();
      drawPieChart();
    }
  }, [loading, blocks, examProfile]);

  const drawBarChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    const data = last7Days.map(day => {
      const dayBlocks = blocks.filter(b => b.date === format(day, 'yyyy-MM-dd') && b.status === 'done');
      return dayBlocks.length * 60; // Assume 60 mins per block for demo
    });

    const maxVal = Math.max(...data, 480); // Max 8 hours

    ctx.clearRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw bars
    const barWidth = (chartWidth / data.length) * 0.6;
    const gap = (chartWidth / data.length) * 0.4;

    data.forEach((val, i) => {
      const barHeight = (val / maxVal) * chartHeight;
      const x = padding + i * (barWidth + gap) + gap / 2;
      const y = height - padding - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, height - padding);
      gradient.addColorStop(0, '#7c3aed');
      gradient.addColorStop(1, '#06b6d4');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      // Labels
      ctx.fillStyle = '#9492b0';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(format(last7Days[i], 'EEE'), x + barWidth / 2, height - padding + 15);
    });
  };

  const drawPieChart = () => {
    const canvas = pieRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 20;

    const subjectData = examProfile?.subjects.map(s => {
      const count = blocks.filter(b => b.subjectId === s.id && b.status === 'done').length;
      return { name: s.name, count, color: s.color };
    }).filter(s => s.count > 0) || [];

    const total = subjectData.reduce((acc, s) => acc + s.count, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    subjectData.forEach(s => {
      const sliceAngle = (s.count / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
      ctx.fillStyle = s.color;
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Inner circle for donut effect
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#13131f';
    ctx.fill();
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('analytics.title')}</h1>
          <p className="text-sm text-text-secondary">Deep dive into your study performance.</p>
        </div>
        <div className="flex bg-elevated border border-border rounded-xl p-1">
          {['all_time', 'this_week', 'today'].map((tf) => (
            <button
              key={tf}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                tf === 'this_week' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t(`leaderboard.${tf}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Study Hours Line Chart */}
        <section className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-primary">
              <TrendingUp size={20} />
              <h2 className="font-semibold">{t('analytics.study_hours')}</h2>
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Last 7 Days</span>
          </div>
          <canvas ref={canvasRef} width={600} height={300} className="w-full h-64" />
        </section>

        {/* Subject Distribution */}
        <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 text-accent">
            <PieChart size={20} />
            <h2 className="font-semibold">{t('analytics.subject_distribution')}</h2>
          </div>
          <div className="flex flex-col items-center gap-8">
            <canvas ref={pieRef} width={200} height={200} className="w-48 h-48" />
            <div className="grid grid-cols-2 gap-4 w-full">
              {examProfile?.subjects.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-medium text-text-secondary truncate">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Productivity Heatmap Placeholder */}
        <section className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 text-green-500">
            <Calendar size={20} />
            <h2 className="font-semibold">{t('analytics.productivity_heatmap')}</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 90 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-3.5 h-3.5 rounded-sm ${
                  i % 7 === 0 ? 'bg-primary' : 
                  i % 5 === 0 ? 'bg-primary/60' :
                  i % 3 === 0 ? 'bg-primary/30' :
                  'bg-elevated'
                }`}
                title={`Day ${i}`}
              />
            ))}
          </div>
        </section>

        {/* Insights */}
        <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 text-yellow-500">
            <Activity size={20} />
            <h2 className="font-semibold">{t('analytics.insights')}</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-elevated/50 rounded-xl border-l-4 border-primary space-y-1">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Peak Performance</p>
              <p className="text-sm font-medium">You study best between 8am–10am.</p>
            </div>
            <div className="p-4 bg-elevated/50 rounded-xl border-l-4 border-accent space-y-1">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Focus Area</p>
              <p className="text-sm font-medium">Physics is getting the least attention this week.</p>
            </div>
            <div className="p-4 bg-elevated/50 rounded-xl border-l-4 border-red-500 space-y-1">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Streak Warning</p>
              <p className="text-sm font-medium">Your streak is at risk — study today!</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
