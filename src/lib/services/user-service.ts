/**
 * FaveFit v2 - ユーザーサービス
 * ユーザー関連のビジネスロジック（栄養目標計算、好み学習）
 */

import { mastra } from "@/mastra";
import { PreferenceAnalysis } from "@/mastra/agents/preference-learner";
import { updateLearnedPreferences, updateUserNutrition, updateUserNutritionPreferences } from "@/lib/user";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { calculatePersonalizedMacroGoals } from "@/lib/tools/calculateMacroGoals";

export interface CalculateNutritionRequest {
  userId: string;
  profile: {
    age: number;
    gender: "male" | "female";
    height_cm: number;
    weight_kg: number;
    activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
    goal: "lose" | "maintain" | "gain";
  };
  preferences?: {
    lossPaceKgPerMonth?: number;
    maintenanceAdjustKcalPerDay?: number;
    gainPaceKgPerMonth?: number;
    gainStrategy?: "lean" | "standard" | "aggressive";
    macroPreset?: "balanced" | "lowfat" | "lowcarb" | "highprotein";
  };
}

export interface CalculateNutritionResponse {
  nutrition: {
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

export interface LearnPreferenceRequest {
  userId: string;
  recipeId: string;
  feedback: {
    wantToMakeAgain: boolean;
    comment?: string;
  };
}

export interface LearnPreferenceResponse {
  analysis: PreferenceAnalysis;
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
    dailyCalories: result.targetCalories,
    pfc: result.pfc,
    preferences,
  };

  await updateUserNutrition(userId, nutrition);

  return { nutrition };
}

export async function updateNutritionPreferences(
  userId: string,
  preferences: NonNullable<CalculateNutritionRequest["preferences"]>
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

  const agent = mastra.getAgent("preferenceLearner");

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

  const result = await agent.generate(messageText);

  // 構造化出力が有効な場合は直接取得、そうでない場合はJSONをパース
  let analysis: PreferenceAnalysis;
  if (result.text) {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : result.text;
    analysis = JSON.parse(jsonString);
  } else if (result.object) {
    analysis = result.object as PreferenceAnalysis;
  } else {
    throw new Error("AI応答が無効です");
  }

  await updateLearnedPreferences(
    userId,
    analysis.cuisineUpdates,
    analysis.flavorUpdates
  );

  return { analysis };
}
