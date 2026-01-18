'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged, User, signInWithPopup, linkWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { getOrCreateUserProfile, UserProfile } from '@/lib/user';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  linkGoogleAccount: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) return;
    try {
      await linkWithPopup(auth.currentUser, googleProvider);
    } catch (error) {
      console.error('Account linking failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    // マウント時に自動で匿名ログインを試行
    const login = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Anonymous auth failed:', error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userProfile = await getOrCreateUserProfile(currentUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    login();

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, linkGoogleAccount }}>
      {children}
    </AuthContext.Provider>
  );
};
