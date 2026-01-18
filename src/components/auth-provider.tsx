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
  signInGuest: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInGuest: async () => {},
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

  const signInGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Guest sign-in failed:', error);
      throw error;
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) return;
    try {
      await linkWithPopup(auth.currentUser, googleProvider);
      // 連携成功後、ユーザー情報をリロードしてisAnonymousの状態を更新する
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
      
      // プロファイル情報も再取得
      const userProfile = await getOrCreateUserProfile(auth.currentUser.uid);
      setProfile(userProfile);
    } catch (error) {
      console.error('Account linking failed:', error);
      throw error;
    }
  };

  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInGuest, linkGoogleAccount }}>
      {children}
    </AuthContext.Provider>
  );
};
