/**
 * FaveFit v2 - ユーザーサービス
 * 設計書 v2 に基づくユーザー関連操作
 */

import {
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { docRefs } from "./collections";
import {
  UserDocument,
  UserProfile,
  UserNutrition,
  LearnedPreferences,
} from "@/lib/schema";

// 型を再エクスポート
export type { UserDocument, UserProfile, UserNutrition, LearnedPreferences };

// ========================================
// ユーザープロファイル操作
// ========================================

/**
 * ユーザードキュメントを取得または新規作成
 */
export const getOrCreateUser = async (
  uid: string,
  isGuest: boolean = false
): Promise<UserDocument | null> => {
  try {
    const userRef = docRefs.user(uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    }

    // 初期ドキュメントの作成 (構造化されたスキーマに対応)
    const initialProfile: UserProfile = {
      identity: {
        displayName: isGuest ? "ゲストユーザー" : "",
        isGuest,
        createdAt: serverTimestamp(),
      },
      physical: {
        currentWeight: 0,
        targetWeight: 0,
        deadline: serverTimestamp() as unknown as Timestamp,
      },
      lifestyle: {
        cheatDayFrequency: "weekly",
      },
    };

    const initialNutrition: UserNutrition = {
      dailyCalories: 0,
      pfc: { protein: 0, fat: 0, carbs: 0 },
    };

    const initialPreferences: LearnedPreferences = {
      cuisines: {},
      flavorProfile: {},
      dislikedIngredients: [],
    };

    const newUser: UserDocument = {
      profile: initialProfile,
      nutrition: initialNutrition,
      learnedPreferences: initialPreferences,
      onboardingCompleted: false,
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, newUser);
    return newUser;
  } catch (error) {
    console.error("Error getting/creating user:", error);
    return null;
  }
};

/**
 * ユーザープロファイルを更新
 * profile.{sub}.{key} の形式で深度に応じた更新を行う
 */
export const updateUserProfile = async (
  uid: string,
  profileData: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = docRefs.user(uid);
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    // profile の各カテゴリ（identity, physical, lifestyle）を処理
    if (profileData.identity) {
      Object.entries(profileData.identity).forEach(([key, value]) => {
        updates[`profile.identity.${key}`] = value;
      });
    }
    if (profileData.physical) {
      Object.entries(profileData.physical).forEach(([key, value]) => {
        updates[`profile.physical.${key}`] = value;
      });
    }
    if (profileData.lifestyle) {
      Object.entries(profileData.lifestyle).forEach(([key, value]) => {
        updates[`profile.lifestyle.${key}`] = value;
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(userRef, updates as any);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * 栄養目標を更新
 */
export const updateUserNutrition = async (
  uid: string,
  nutritionData: UserNutrition
): Promise<void> => {
  try {
    const userRef = docRefs.user(uid);
    await updateDoc(userRef, {
      nutrition: nutritionData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user nutrition:", error);
    throw error;
  }
};

/**
 * 栄養方針（preferences）を更新
 */
export const updateUserNutritionPreferences = async (
  uid: string,
  preferences: NonNullable<UserNutrition["preferences"]>
): Promise<void> => {
  try {
    const userRef = docRefs.user(uid);
    await updateDoc(userRef, {
      "nutrition.preferences": preferences,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating nutrition preferences:", error);
    throw error;
  }
};

/**
 * オンボーディング完了をマーク
 */
export const completeOnboarding = async (uid: string): Promise<void> => {
  try {
    const userRef = docRefs.user(uid);
    await updateDoc(userRef, {
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    throw error;
  }
};

/**
 * プラン作成状態を「作成中」に設定
 */
export const setPlanCreating = async (uid: string): Promise<void> => {
  try {
    const userRef = docRefs.user(uid);
    await updateDoc(userRef, {
      planCreationStatus: "creating",
      planCreationStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error setting plan creating status:", error);
    throw error;
  }
};

/**
 * プラン作成状態を「完了」に設定（statusをnullにクリア）
 */
export const setPlanCreated = async (uid: string): Promise<void> => {
  try {
    const userRef = docRefs.user(uid);
    await updateDoc(userRef, {
      planCreationStatus: null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error clearing plan creation status:", error);
    throw error;
  }
};

// ========================================
// 嗜好学習関連
// ========================================

/**
 * 嗜好プロファイルを更新（スコア加算）
 */
export const updateLearnedPreferences = async (
  uid: string,
  cuisineUpdates?: Record<string, number>,
  flavorUpdates?: Record<string, number>,
  newDisliked?: string[]
): Promise<void> => {
  try {
    const userRef = docRefs.user(uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("User not found");
    }

    const currentPrefs = userSnap.data().learnedPreferences;

    // cuisines スコアを加算
    const updatedCuisines = { ...currentPrefs.cuisines };
    if (cuisineUpdates) {
      Object.entries(cuisineUpdates).forEach(([key, delta]) => {
        updatedCuisines[key] = (updatedCuisines[key] || 0) + delta;
      });
    }

    // flavorProfile スコアを加算
    const updatedFlavors = { ...currentPrefs.flavorProfile };
    if (flavorUpdates) {
      Object.entries(flavorUpdates).forEach(([key, delta]) => {
        updatedFlavors[key] = (updatedFlavors[key] || 0) + delta;
      });
    }

    // 嫌いな食材を追加
    const updatedDisliked = newDisliked
      ? [...new Set([...currentPrefs.dislikedIngredients, ...newDisliked])]
      : currentPrefs.dislikedIngredients;

    await updateDoc(userRef, {
      learnedPreferences: {
        cuisines: updatedCuisines,
        flavorProfile: updatedFlavors,
        dislikedIngredients: updatedDisliked,
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating learned preferences:", error);
    throw error;
  }
};

/**
 * 嗜好プロファイルを取得
 */
export const getLearnedPreferences = async (
  uid: string
): Promise<LearnedPreferences | null> => {
  try {
    const userRef = docRefs.user(uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return userSnap.data().learnedPreferences;
  } catch (error) {
    console.error("Error getting learned preferences:", error);
    return null;
  }
};
