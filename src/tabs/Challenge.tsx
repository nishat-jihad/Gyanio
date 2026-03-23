import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Sword, Plus, Copy, Check, Send, X, Users, Trophy } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, getDocs, increment } from 'firebase/firestore';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { Challenge, UserProfile } from '../types';
import { format } from 'date-fns';
import { updateStudyStats, updateStreak, awardBadge } from '../services/statsService';

export default function ChallengeTab() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [opponentEmail, setOpponentEmail] = useState('');
  const [duration, setDuration] = useState(60);
  const [topics, setTopics] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'challenges'),
      where('opponentIds', 'array-contains', profile.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge));
      setChallenges(data);
      setLoading(false);
    });

    const qOwn = query(
      collection(db, 'challenges'),
      where('challengerId', '==', profile.uid)
    );
    const unsubscribeOwn = onSnapshot(qOwn, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge));
      setChallenges(prev => [...prev, ...data].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
    });

    return () => {
      unsubscribe();
      unsubscribeOwn();
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!activeChallenge) return;
    const chatRef = ref(rtdb, `challenges/${activeChallenge.id}/chat`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setChatMessages(Object.values(data));
      }
    });
    return () => unsubscribe();
  }, [activeChallenge]);

  const createChallenge = async () => {
    if (!profile?.uid) return;
    
    // Find opponent by email (simplified for demo)
    const usersQ = query(collection(db, 'users'), where('email', '==', opponentEmail));
    const usersSnap = await getDocs(usersQ);
    if (usersSnap.empty) {
      alert('User not found');
      return;
    }
    const opponent = usersSnap.docs[0].data() as UserProfile;

    const newChallenge: Partial<Challenge> = {
      challengerId: profile.uid,
      opponentIds: [opponent.uid],
      duration,
      topics: topics.filter(t => t.trim()),
      status: 'pending',
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'challenges'), newChallenge);
    setShowCreate(false);
    setOpponentEmail('');
    setTopics(['']);
  };

  const acceptChallenge = async (challenge: Challenge) => {
    await updateDoc(doc(db, 'challenges', challenge.id), {
      status: 'active',
      startTime: new Date().toISOString()
    });
    setActiveChallenge(challenge);
  };

  const completeChallenge = async (challenge: Challenge, winnerId: string) => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, 'challenges', challenge.id), {
      status: 'completed',
      winnerId,
      endTime: new Date().toISOString()
    });
    
    if (winnerId === profile.uid) {
      await updateStudyStats(profile.uid, challenge.duration);
      await updateStreak(profile.uid);
      await awardBadge(profile.uid, 'challenge_winner');
      await updateDoc(doc(db, 'users', profile.uid), {
        'stats.challengesWon': increment(1)
      });
    }
    setActiveChallenge(null);
  };

  const sendMessage = () => {
    if (!activeChallenge || !message.trim() || !profile) return;
    const chatRef = ref(rtdb, `challenges/${activeChallenge.id}/chat`);
    push(chatRef, {
      uid: profile.uid,
      displayName: profile.displayName,
      text: message,
      timestamp: Date.now()
    });
    setMessage('');
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('challenge.title')}</h1>
          <p className="text-sm text-text-secondary">Challenge your friends to a study duel.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus size={18} />
          {t('challenge.create')}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {challenges.filter(c => c.status === 'pending').length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Pending Requests</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {challenges.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id} className="bg-surface border border-border p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Sword size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Challenge from {c.challengerId === profile?.uid ? 'You' : 'Friend'}</span>
                        <span className="text-xs text-text-secondary">{c.duration} mins • {c.topics.length} topics</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.challengerId !== profile?.uid ? (
                        <>
                          <button 
                            onClick={() => acceptChallenge(c)}
                            className="flex-1 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all"
                          >
                            {t('challenge.accept')}
                          </button>
                          <button className="px-4 py-2 bg-elevated border border-border rounded-xl text-xs font-bold uppercase tracking-widest hover:text-red-500 transition-all">
                            {t('challenge.decline')}
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 py-2 bg-elevated border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-center text-text-secondary">
                          Waiting for opponent...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">{t('challenge.history')}</h2>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-elevated/50">
                    <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Opponent</th>
                    <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Duration</th>
                    <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Result</th>
                    <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.filter(c => c.status === 'completed').map(c => (
                    <tr key={c.id} className="border-b border-border hover:bg-elevated/30 transition-colors">
                      <td className="p-4 text-sm font-medium">Friend</td>
                      <td className="p-4 text-sm text-text-secondary">{c.duration}m</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest">Won</span>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{format(new Date(c.createdAt), 'MMM do')}</td>
                    </tr>
                  ))}
                  {challenges.filter(c => c.status === 'completed').length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-text-secondary text-sm italic">
                        No completed challenges yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Active Challenge Widget */}
          {activeChallenge ? (
            <section className="bg-primary/10 border border-primary/30 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-primary uppercase tracking-widest">Active Challenge</h2>
                <div className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded uppercase tracking-widest animate-pulse">Live</div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-4xl font-mono font-bold text-text-primary">45:00</p>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Time Remaining</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {activeChallenge.topics.map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-elevated border border-border rounded-lg text-xs font-medium">{t}</span>
                  ))}
                </div>
              </div>

              <div className="h-px bg-primary/20" />

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Live Chat</h3>
                <div className="h-48 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.uid === profile?.uid ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-text-secondary font-bold mb-1">{msg.displayName}</span>
                      <div className={`px-3 py-2 rounded-xl text-xs max-w-[80%] ${msg.uid === profile?.uid ? 'bg-primary text-white rounded-tr-none' : 'bg-elevated border border-border rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-elevated border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary/50"
                  />
                  <button 
                    onClick={sendMessage}
                    className="p-2 bg-primary text-white rounded-xl hover:scale-105 transition-all"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setActiveChallenge(null)}
                className="w-full py-2 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
              >
                {t('challenge.quit')}
              </button>
            </section>
          ) : (
            <section className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-elevated flex items-center justify-center text-text-secondary">
                <Trophy size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-text-primary font-medium">No active challenge</p>
                <p className="text-xs text-text-secondary">Start a new duel or enter a code to join one.</p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter Code"
                  className="flex-1 bg-elevated border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary/50"
                />
                <button className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">
                  Join
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Create Challenge Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-base/80 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t('challenge.create')}</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 text-text-secondary hover:text-text-primary"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Opponent Email</label>
                <input 
                  type="email" 
                  value={opponentEmail}
                  onChange={(e) => setOpponentEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Duration (minutes)</label>
                <input 
                  type="number" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary/50 outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Topics</label>
                  <button 
                    onClick={() => setTopics([...topics, ''])}
                    className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                  >
                    Add Topic
                  </button>
                </div>
                <div className="space-y-2">
                  {topics.map((topic, i) => (
                    <input 
                      key={i}
                      type="text" 
                      value={topic}
                      onChange={(e) => {
                        const newTopics = [...topics];
                        newTopics[i] = e.target.value;
                        setTopics(newTopics);
                      }}
                      placeholder={`Topic ${i + 1}`}
                      className="w-full bg-elevated border border-border rounded-xl px-4 py-2 text-sm focus:border-primary/50 outline-none"
                    />
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={createChallenge}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Send Challenge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
