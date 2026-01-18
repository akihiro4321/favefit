import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';

export interface UserPreference {
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  allergies: string[];
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  availableTime: 'short' | 'medium' | 'long';
  learnedProfile: {
    preferredCuisines: Record<string, number>;
    preferredFlavors: Record<string, number>;
    preferredIngredients: Record<string, number>;
    avoidPatterns: Record<string, number>;
    totalFeedbacks: number;
  };
  updatedAt: FieldValue;
}

const DEFAULT_PREFERENCE: Omit<UserPreference, 'updatedAt'> = {
  favoriteIngredients: [],
  dislikedIngredients: [],
  allergies: [],
  cookingSkillLevel: 'intermediate',
  availableTime: 'medium',
  learnedProfile: {
    preferredCuisines: {},
    preferredFlavors: {},
    preferredIngredients: {},
    avoidPatterns: {},
    totalFeedbacks: 0,
  },
};

export const getPreference = async (uid: string): Promise<UserPreference | null> => {
  try {
    const prefRef = doc(db, 'users', uid, 'preferences', 'main');
    const prefSnap = await getDoc(prefRef);

    if (prefSnap.exists()) {
      return prefSnap.data() as UserPreference;
    } else {
      // 初期データの作成
      const newPref: UserPreference = {
        ...DEFAULT_PREFERENCE,
        updatedAt: serverTimestamp(),
      };
      await setDoc(prefRef, newPref);
      return newPref;
    }
  } catch (error) {
    console.error('Error getting preference:', error);
    return null;
  }
};

export const updatePreference = async (uid: string, data: Partial<UserPreference>): Promise<void> => {
  try {
    const prefRef = doc(db, 'users', uid, 'preferences', 'main');
    
    // ドキュメントが存在しない場合は作成（念のため）
    const prefSnap = await getDoc(prefRef);
    if (!prefSnap.exists()) {
       const newPref: UserPreference = {
        ...DEFAULT_PREFERENCE,
        ...data,
        updatedAt: serverTimestamp(),
      };
      await setDoc(prefRef, newPref);
      return;
    }

    await updateDoc(prefRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating preference:', error);
    throw error;
  }
};
