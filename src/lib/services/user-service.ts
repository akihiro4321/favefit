/**
 * FaveFit v2 - ユーザーサービス
 * ユーザー関連のビジネスロジック（栄養目標計算、好み学習）
 */

import { runPreferenceLearner, PreferenceLearnerOutput } from "@/ai/agents/preference-learner";
import { updateLearnedPreferences, updateUserNutrition, updateUserNutritionPreferences } from "@/lib/db/firestore/userRepository";
import { db } from "@/lib/db/firestore/client";
import { doc, getDoc } from "firebase/firestore";
import { calculatePersonalizedMacroGoals } from "@/lib/tools/calculateMacroGoals";
import type {
  CalculateNutritionRequest,
  LearnPreferenceRequest,
  UpdateNutritionPreferencesRequest,
} from "@/lib/schemas/user";

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
 * ユーザーの好みを学習
 */
export async function learnPreference(
  request: LearnPreferenceRequest
): Promise<LearnPreferenceResponse> {
  const { userId, recipeId, feedback } = request;

  const recipeRef = doc(db, "recipeHistory", userId, "recipes", recipeId);
  const recipeSnap = await getDoc(recipeRef);

  if (!recipeSnap.exists()) {
    throw new Error("Recipe not found");
  }

  const recipe = recipeSnap.data();

  const messageText = `
【分析対象データ】
■ レシピ
タイトル: ${recipe.title}
タグ: ${JSON.stringify(recipe.tags || [])}
材料: ${JSON.stringify(recipe.ingredients || [])}

■ ユーザーフィードバック
また作りたいか: ${feedback.wantToMakeAgain ? "はい" : "いいえ"}
コメント: "${feedback.comment || "なし"}"
`;

  const analysis = await runPreferenceLearner(messageText);

  await updateLearnedPreferences(
    userId,
    analysis.cuisineUpdates,
    analysis.flavorUpdates
  );

  return { analysis };
}
