import { doc, updateDoc, increment, setDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, LeaderboardEntry } from '../types';

export const updateStudyStats = async (userId: string, minutes: number) => {
  const userRef = doc(db, 'users', userId);
  const hours = minutes / 60;

  // Update user profile stats
  await updateDoc(userRef, {
    'stats.totalStudyHours': increment(hours),
    'stats.tasksCompleted': increment(1),
    'updatedAt': new Date().toISOString()
  });

  // Update leaderboard entries
  const timeframes = ['today', 'this_week', 'all_time'];
  for (const timeframe of timeframes) {
    const leaderboardRef = doc(db, 'leaderboards', timeframe, 'entries', userId);
    const snap = await getDoc(leaderboardRef);
    
    if (snap.exists()) {
      await updateDoc(leaderboardRef, {
        score: increment(hours),
        updatedAt: new Date().toISOString()
      });
    } else {
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() as UserProfile;
      const entry: LeaderboardEntry = {
        uid: userId,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        score: hours,
        category: 'study_hours',
        updatedAt: new Date().toISOString()
      } as LeaderboardEntry;
      await setDoc(leaderboardRef, entry);
    }
  }
};

export const updateStreak = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data() as UserProfile;
  const lastActive = data.updatedAt ? new Date(data.updatedAt) : new Date(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastActive.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Streak continues
    await updateDoc(userRef, {
      'stats.currentStreak': increment(1),
      'stats.bestStreak': Math.max(data.stats.bestStreak, data.stats.currentStreak + 1)
    });
  } else if (diffDays > 1) {
    // Streak broken
    await updateDoc(userRef, {
      'stats.currentStreak': 1
    });
  }
};

export const awardBadge = async (userId: string, badgeId: string) => {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data() as UserProfile;
  if (!data.badges.includes(badgeId)) {
    await updateDoc(userRef, {
      badges: [...data.badges, badgeId],
      'stats.totalBadges': increment(1)
    });
    return true; // New badge awarded
  }
  return false;
};
