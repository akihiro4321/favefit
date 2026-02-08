/**
 * FaveFit v2 - メニューサービス
 * メニュー提案に関するビジネスロジック
 */

import {
  generateMenuSuggestions,
  getMenuAdjustmentPrompt,
  MenuAdjusterInput,
} from "@/server/ai";
import { getOrCreateUser } from "@/server/db/firestore/userRepository";
import { IngredientItem } from "@/lib/schema";

export interface SuggestMenuRequest {
  userId: string;
  ingredients: IngredientItem[];
  comment?: string;
  previousSuggestions?: unknown[];
}

export interface MenuSuggestion {
  recipeId: string;
  title: string;
  description: string;
  tags: string[];
  ingredients: { name: string; amount: string }[];
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

  const menuAdjusterInput: MenuAdjusterInput = {
    availableIngredients: ingredients,
    targetNutrition,
    userComment: comment,
    previousSuggestions: previousSuggestions
      ? previousSuggestions.filter((s): s is string => typeof s === "string")
      : undefined,
    preferences: {
      cuisines: userDoc.learnedPreferences.cuisines,
      flavorProfile: userDoc.learnedPreferences.flavorProfile,
      dislikedIngredients: userDoc.learnedPreferences.dislikedIngredients,
    },
  };

  const prompt = getMenuAdjustmentPrompt(menuAdjusterInput);
  const aiResult = await generateMenuSuggestions(prompt);

  const suggestions = aiResult.suggestions.map(
    (s: {
      recipeId?: string;
      title: string;
      description: string;
      tags?: string[];
      ingredients?: { name: string; amount: string }[];
      additionalIngredients?: string[];
      steps?: string[];
      nutrition: {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
      };
    }) => ({
      recipeId:
        s.recipeId ||
        `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: s.title,
      description: s.description,
      tags: s.tags || [],
      ingredients: s.ingredients || [],
      additionalIngredients: s.additionalIngredients || [],
      steps: s.steps || [],
      nutrition: s.nutrition,
    }),
  );

  return {
    suggestions,
    message: aiResult.message,
  };
}
