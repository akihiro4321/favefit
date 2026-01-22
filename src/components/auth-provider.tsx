'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged, User, signInWithPopup, linkWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { getOrCreateUser, UserDocument } from '@/lib/user';

export interface AuthContextType {
  user: User | null;
  profile: UserDocument | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInGuest: async () => {},
  linkGoogleAccount: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const userProfile = await getOrCreateUser(auth.currentUser.uid);
      setProfile(userProfile);
    }
  };

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
      const userProfile = await getOrCreateUser(auth.currentUser.uid);
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
        const userProfile = await getOrCreateUser(currentUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInGuest, linkGoogleAccount, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
