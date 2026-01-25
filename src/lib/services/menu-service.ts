/**
 * FaveFit v2 - メニューサービス
 * メニュー提案に関するビジネスロジック
 */

import { mastra } from "@/mastra";
import { MenuAdjusterInput } from "@/mastra/agents/menu-adjuster";
import { getOrCreateUser } from "@/lib/db/firestore/userRepository";

export interface SuggestMenuRequest {
  userId: string;
  ingredients: string[];
  comment?: string;
  previousSuggestions?: unknown[];
}

export interface MenuSuggestion {
  recipeId: string;
  title: string;
  description: string;
  tags: string[];
  ingredients: string[];
  additionalIngredients: string[];
  steps: string[];
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

export interface SuggestMenuResponse {
  suggestions: MenuSuggestion[];
  message: string;
}

/**
 * メニューを提案
 */
export async function suggestMenu(
  request: SuggestMenuRequest
): Promise<SuggestMenuResponse> {
  const { userId, ingredients, comment, previousSuggestions } = request;

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    throw new Error("ユーザーが見つかりません");
  }

  const dailyCalories = userDoc.nutrition.dailyCalories || 1800;
  const pfc = userDoc.nutrition.pfc || { protein: 100, fat: 50, carbs: 200 };

  const targetNutrition = {
    calories: Math.round(dailyCalories / 3),
    protein: Math.round(pfc.protein / 3),
    fat: Math.round(pfc.fat / 3),
    carbs: Math.round(pfc.carbs / 3),
  };

  const input: MenuAdjusterInput = {
    availableIngredients: ingredients,
    targetNutrition,
    userComment: comment || undefined,
    previousSuggestions: previousSuggestions
      ? (previousSuggestions.filter((s): s is string => typeof s === "string"))
      : undefined,
    preferences: {
      cuisines: userDoc.learnedPreferences.cuisines,
      flavorProfile: userDoc.learnedPreferences.flavorProfile,
      dislikedIngredients: userDoc.learnedPreferences.dislikedIngredients,
    },
  };

  const agent = mastra.getAgent("menuAdjuster");

  const messageText = `以下の条件でメニューを3つ提案してください。必ずJSON形式で出力してください。

【条件】
${JSON.stringify(input, null, 2)}`;

  const result = await agent.generate(messageText);

  // 構造化出力が有効な場合は直接取得、そうでない場合はJSONをパース
  let parsedResult;
  if (result.text) {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON:", result.text);
      throw new Error("AI応答からJSONを抽出できませんでした");
    }
    parsedResult = JSON.parse(jsonMatch[0]);
  } else if (result.object) {
    parsedResult = result.object;
  } else {
    throw new Error("AI応答が無効です");
  }

  const suggestions = (parsedResult.suggestions || []).map(
    (s: {
      recipeId?: string;
      title: string;
      description: string;
      tags?: string[];
      ingredients?: string[];
      additionalIngredients?: string[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    }) => ({
      recipeId:
        s.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: s.title,
      description: s.description,
      tags: s.tags || [],
      ingredients: s.ingredients || [],
      additionalIngredients: s.additionalIngredients || [],
      steps: s.steps || [],
      nutrition: s.nutrition,
    })
  );

  return {
    suggestions,
    message: parsedResult.message || "レシピを提案しました！",
  };
}
