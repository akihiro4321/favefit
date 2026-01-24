/**
 * FaveFit v2 - メニューサービス
 * メニュー提案に関するビジネスロジック
 */

import { InMemoryRunner } from "@google/adk";
import { menuAdjusterAgent, MenuAdjusterInput } from "@/lib/agents/menu-adjuster";
import { getOrCreateUser } from "@/lib/user";
import { withLangfuseTrace, processAdkEventsWithTrace } from "@/lib/langfuse";

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

  const runner = new InMemoryRunner({
    agent: menuAdjusterAgent,
    appName: "FaveFit",
  });

  const sessionId = `suggest-${userId}-${Date.now()}`;

  await runner.sessionService.createSession({
    sessionId,
    userId,
    appName: "FaveFit",
    state: {},
  });

  const messageText = `以下の条件でメニューを3つ提案してください。必ずJSON形式で出力してください。

【条件】
${JSON.stringify(input, null, 2)}`;

  const userMessage = {
    role: "user",
    parts: [{ text: messageText }],
  };

  const result = await withLangfuseTrace(
    "suggest-menu",
    userId,
    { ingredients, comment },
    async (trace) => {
      const events = runner.runAsync({ userId, sessionId, newMessage: userMessage });

      const fullText = await processAdkEventsWithTrace(trace, events, userMessage, menuAdjusterAgent.instruction as string);

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Failed to extract JSON:", fullText);
        throw new Error("AI応答からJSONを抽出できませんでした");
      }

      return JSON.parse(jsonMatch[0]);
    }
  );

  const suggestions = (result.suggestions || []).map(
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
    message: result.message || "レシピを提案しました！",
  };
}
