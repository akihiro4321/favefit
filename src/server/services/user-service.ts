/**
 * FaveFit v2 - ユーザーサービス
 * ユーザー関連のビジネスロジック（栄養目標計算、好み学習）
 */

import {
  analyzePreferenceData,
  getPreferenceLearningPrompt,
  PreferenceLearnerOutput,
  PreferenceLearnerInput,
} from "@/server/ai";
import {
  updateLearnedPreferences as updateLearnedPreferencesRepo,
  updateUserNutrition,
  updateUserNutritionPreferences,
  getOrCreateUser,
  updateUserProfile as updateUserProfileRepo,
  completeOnboarding as completeOnboardingRepo,
  setPlanCreating as setPlanCreatingRepo,
} from "@/server/db/firestore/userRepository";
import { getHistoryItem } from "@/server/db/firestore/recipeHistoryRepository";
import { calculatePersonalizedMacroGoals } from "@/lib/tools/calculateMacroGoals";
import type {
  CalculateNutritionRequest,
  LearnPreferenceRequest,
  UpdateNutritionPreferencesRequest,
  UpdateLearnedPreferencesRequest,
} from "@/lib/schemas/user";
import { RecipeHistoryItem, UserDocument, UserProfile } from "@/lib/schema";

export interface CalculateNutritionResponse {
  nutrition: {
    bmr: number;
    tdee: number;
    dailyCalories: number;
    pfc: {
      protein: number;
      fat: number;
      carbs: number;
    };
    strategySummary?: string;
    preferences?: {
      lossPaceKgPerMonth?: number;
      maintenanceAdjustKcalPerDay?: number;
      gainPaceKgPerMonth?: number;
      gainStrategy?: "lean" | "standard" | "aggressive";
      macroPreset?: "balanced" | "lowfat" | "lowcarb" | "highprotein";
    };
  };
}

export interface LearnPreferenceResponse {
  analysis: PreferenceLearnerOutput;
}

export interface GetUserProfileRequest {
  userId: string;
}

export interface GetUserProfileResponse {
  user: UserDocument;
}

export interface UpdateUserProfileRequest {
  userId: string;
  profileData: Partial<UserProfile>;
}

export interface CompleteOnboardingRequest {
  userId: string;
}

export interface SetPlanCreatingRequest {
  userId: string;
}

/**
 * ユーザープロファイルを取得（または作成）
 */
export async function getUserProfile(
  request: GetUserProfileRequest
): Promise<GetUserProfileResponse> {
  const { userId } = request;
  const user = await getOrCreateUser(userId);
  if (!user) {
    throw new Error("Failed to get or create user");
  }
  return { user };
}

/**
 * 栄養目標を計算
 */
export async function calculateNutrition(
  request: CalculateNutritionRequest
): Promise<CalculateNutritionResponse> {
  const { userId, profile, preferences } = request;
  const result = calculatePersonalizedMacroGoals({
    ...profile,
    preferences,
  });

  const nutrition = {
    bmr: result.bmr,
    tdee: result.tdee,
    dailyCalories: result.targetCalories,
    pfc: result.pfc,
    preferences,
  };

  await updateUserNutrition(userId, nutrition);

  return { nutrition };
}

export async function updateNutritionPreferences(
  userId: string,
  preferences: UpdateNutritionPreferencesRequest["preferences"]
): Promise<void> {
  await updateUserNutritionPreferences(userId, preferences);
}

/**
 * ユーザープロファイルを更新
 */
export async function updateUserProfile(
  request: UpdateUserProfileRequest
): Promise<void> {
  const { userId, profileData } = request;
  await updateUserProfileRepo(userId, profileData);
}

/**
 * オンボーディングを完了
 */
export async function completeOnboarding(
  request: CompleteOnboardingRequest
): Promise<void> {
  const { userId } = request;
  await completeOnboardingRepo(userId);
}

/**
 * プラン作成状態を「作成中」に設定
 */
export async function setPlanCreating(
  request: SetPlanCreatingRequest
): Promise<void> {
  const { userId } = request;
  await setPlanCreatingRepo(userId);
}

/**
 * ユーザーの嗜好プロファイルを更新（直接的な変更）
 */
export async function updateLearnedPreferences(
  request: UpdateLearnedPreferencesRequest
): Promise<void> {
  const { userId, cuisineUpdates, flavorUpdates, newDisliked } = request;
  await updateLearnedPreferencesRepo(
    userId,
    cuisineUpdates,
    flavorUpdates,
    newDisliked
  );
}

/**
 * ユーザーの好みを学習
 */
export async function learnPreference(
  request: LearnPreferenceRequest
): Promise<LearnPreferenceResponse> {
  const { userId, recipeId, feedback } = request;

  const recipe = (await getHistoryItem(userId, recipeId)) as RecipeHistoryItem;
  if (!recipe) {
    throw new Error("Recipe not found");
  }

  const input: PreferenceLearnerInput = {
    recipe: {
      title: recipe.title,
      tags: recipe.tags || [],
      ingredients: (recipe.ingredients || []).map((i) => i.name),
    },
    feedback: {
      wantToMakeAgain: feedback.wantToMakeAgain,
      comment: feedback.comment,
    },
  };

  const prompt = getPreferenceLearningPrompt(input);
  const analysis = await analyzePreferenceData(prompt);

  // AIからの配列形式をRepositoryが期待するRecord形式に変換
  const cuisineUpdates: Record<string, number> = {};
  analysis.cuisineUpdates.forEach((update) => {
    cuisineUpdates[update.category] = update.score;
  });

  const flavorUpdates: Record<string, number> = {};
  analysis.flavorUpdates.forEach((update) => {
    flavorUpdates[update.flavor] = update.score;
  });

  await updateLearnedPreferences({
    userId,
    cuisineUpdates,
    flavorUpdates,
  });

  return { analysis };
}
