import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  onboardingCompleted: boolean;
  
  // 身体情報
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  activity_level?: 'low' | 'moderate' | 'high';
  goal?: 'lose' | 'maintain' | 'gain';

  // AI計算済み目標
  daily_calorie_target?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  strategy_summary?: string;

  createdAt: FieldValue;
  updatedAt: FieldValue;
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

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
