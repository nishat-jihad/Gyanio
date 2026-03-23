import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Plus, Search, Layers, Check, X, RotateCcw, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Flashcard, ExamProfile } from '../types';
import { format, addDays, isBefore, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { updateStudyStats, updateStreak } from '../services/statsService';

export default function Flashcards() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [examProfile, setExamProfile] = useState<ExamProfile | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  // New card state
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, 'users', profile.uid, 'flashcards'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard));
      setCards(data);
      setLoading(false);
    });

    const profileId = profile.currentExamProfileId || 'default';
    const unsubscribeProfile = onSnapshot(doc(db, 'users', profile.uid, 'examProfiles', profileId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ExamProfile;
        setExamProfile(data);
        if (data.subjects.length > 0) setNewSubject(data.subjects[0].id);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeProfile();
    };
  }, [profile?.uid, profile?.currentExamProfileId]);

  const addCard = async () => {
    if (!profile?.uid || !newQuestion || !newAnswer) return;
    const newCard: Partial<Flashcard> = {
      subjectId: newSubject,
      question: newQuestion,
      answer: newAnswer,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      interval: 0,
      repetition: 0,
      efactor: 2.5
    };
    await addDoc(collection(db, 'users', profile.uid, 'flashcards'), newCard);
    setShowAdd(false);
    setNewQuestion('');
    setNewAnswer('');
  };

  const deleteCard = async (id: string) => {
    if (!profile?.uid) return;
    await deleteDoc(doc(db, 'users', profile.uid, 'flashcards', id));
  };

  const handleReview = async (quality: number) => {
    if (!profile?.uid) return;
    const card = dueCards[currentIndex];
    
    // SM-2 Algorithm
    let { interval, repetition, efactor } = card;
    if (quality >= 3) {
      if (repetition === 0) interval = 1;
      else if (repetition === 1) interval = 6;
      else interval = Math.round(interval * efactor);
      repetition++;
    } else {
      repetition = 0;
      interval = 1;
    }
    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    const dueDate = format(addDays(new Date(), interval), 'yyyy-MM-dd');
    await updateDoc(doc(db, 'users', profile.uid, 'flashcards', card.id), {
      interval, repetition, efactor, dueDate
    });

    if (currentIndex < dueCards.length - 1) {
      setFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 200);
    } else {
      await updateStudyStats(profile.uid, 10); // Assume 10 mins per session
      await updateStreak(profile.uid);
      setStudyMode(false);
      setCurrentIndex(0);
      setFlipped(false);
    }
  };

  const dueCards = cards.filter(c => isBefore(parseISO(c.dueDate), new Date()) || c.dueDate === format(new Date(), 'yyyy-MM-dd'));

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  if (studyMode && dueCards.length > 0) {
    const card = dueCards[currentIndex];
    const subject = examProfile?.subjects.find(s => s.id === card.subjectId);

    return (
      <div className="max-w-2xl mx-auto h-[calc(100vh-120px)] flex flex-col items-center justify-center space-y-12">
        <header className="w-full flex items-center justify-between">
          <button onClick={() => setStudyMode(false)} className="text-sm font-bold text-text-secondary hover:text-text-primary uppercase tracking-widest">Exit Session</button>
          <div className="text-sm font-bold text-text-secondary uppercase tracking-widest">Card {currentIndex + 1} of {dueCards.length}</div>
        </header>

        <div 
          className="w-full h-96 perspective-1000 cursor-pointer group"
          onClick={() => setFlipped(!flipped)}
        >
          <motion.div 
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative w-full h-full preserve-3d"
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-surface border border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-xl">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">{subject?.name || 'General'}</span>
              <p className="text-2xl font-semibold text-text-primary">{card.question}</p>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</p>
            </div>
            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-surface border border-primary/30 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-xl rotate-y-180">
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">Answer</span>
              <p className="text-2xl font-semibold text-text-primary">{card.answer}</p>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {flipped && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 w-full"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleReview(1); }}
                className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
              >
                Hard
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleReview(3); }}
                className="flex-1 py-4 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-2xl font-bold uppercase tracking-widest hover:bg-yellow-500 hover:text-white transition-all"
              >
                Good
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleReview(5); }}
                className="flex-1 py-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl font-bold uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all"
              >
                Easy
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('flashcards.title')}</h1>
          <p className="text-sm text-text-secondary">Master your subjects with spaced repetition.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setStudyMode(true)}
            disabled={dueCards.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Layers size={18} />
            {t('flashcards.review_session')} ({dueCards.length})
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="p-2 rounded-lg bg-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border p-6 rounded-2xl text-center space-y-1">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('flashcards.due_today')}</span>
          <p className="text-3xl font-bold text-primary">{dueCards.length}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-2xl text-center space-y-1">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('flashcards.mastered')}</span>
          <p className="text-3xl font-bold text-accent">{cards.filter(c => c.interval > 30).length}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-2xl text-center space-y-1">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('flashcards.total_cards')}</span>
          <p className="text-3xl font-bold text-text-primary">{cards.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Your Cards</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input type="text" placeholder="Search cards..." className="pl-9 pr-4 py-1.5 bg-elevated border border-border rounded-lg text-xs outline-none focus:border-primary/50" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            const subject = examProfile?.subjects.find(s => s.id === card.subjectId);
            return (
              <div key={card.id} className="bg-surface border border-border p-5 rounded-2xl space-y-4 group">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">{subject?.name || 'General'}</span>
                  <button onClick={() => deleteCard(card.id)} className="p-1 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text-primary line-clamp-2">{card.question}</p>
                  <p className="text-xs text-text-secondary line-clamp-2 italic">{card.answer}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Due: {card.dueDate}</span>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Int: {card.interval}d</span>
                </div>
              </div>
            );
          })}
          {cards.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-elevated flex items-center justify-center text-text-secondary">
                <Layers size={32} />
              </div>
              <p className="text-text-secondary text-sm italic">{t('flashcards.no_cards')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-base/80 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold">{t('flashcards.add_card')}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Subject</label>
                <select 
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 outline-none"
                >
                  {examProfile?.subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="general">General</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('flashcards.front')}</label>
                <textarea 
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 outline-none min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('flashcards.back')}</label>
                <textarea 
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 outline-none min-h-[100px]"
                />
              </div>
            </div>
            <button 
              onClick={addCard}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {t('common.add')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
