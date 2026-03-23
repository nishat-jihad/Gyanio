import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in failed', error);
    }
  };
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Handle redirect result
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect sign in failed', error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const userDoc = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userDoc, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
            setLoading(false);
          } else {
            // Create initial profile
            const initialProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Student',
              email: user.email || '',
              photoURL: user.photoURL || '',
              language: 'en',
              theme: 'light',
              stats: {
                totalStudyHours: 0,
                tasksCompleted: 0,
                challengesWon: 0,
                challengesLost: 0,
                currentStreak: 0,
                bestStreak: 0,
                totalPomodoros: 0,
                totalBadges: 0,
              },
              badges: [],
              createdAt: new Date().toISOString(),
            };
            setDoc(userDoc, initialProfile).then(() => {
              // Profile will be set by the next snapshot
            });
          }
        }, (error) => {
          console.error('Profile listener failed', error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut: () => auth.signOut() }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
