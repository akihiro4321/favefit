import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  onboardingCompleted: boolean;
  createdAt: any;
  updatedAt: any;
}

export const getOrCreateUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    } else {
      // 初期ドキュメントの作成
      const newUser: UserProfile = {
        uid,
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newUser);
      return newUser;
    }
  } catch (error) {
    console.error('Error getting/creating user profile:', error);
    return null;
  }
};
