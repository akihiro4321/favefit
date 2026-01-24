/**
 * FaveFit v2 - ユーザーサービス
 * ユーザー関連のビジネスロジック（栄養目標計算、好み学習）
 */

import { InMemoryRunner, stringifyContent } from "@google/adk";
import { nutritionPlannerAgent } from "@/lib/agents/nutrition-planner";
import { preferenceLearnerAgent, PreferenceAnalysis } from "@/lib/agents/preference-learner";
import { updateUserNutrition, updateLearnedPreferences } from "@/lib/user";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { withLangfuseTrace, processAdkEventsWithTrace } from "@/lib/langfuse";

export interface CalculateNutritionRequest {
  userId: string;
  profile: {
    age: number;
    gender: "male" | "female";
    height_cm: number;
    weight_kg: number;
    activity_level: "low" | "moderate" | "high";
    goal: "lose" | "maintain" | "gain";
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
  const { userId, profile } = request;

  const runner = new InMemoryRunner({
    agent: nutritionPlannerAgent,
    appName: "FaveFit",
  });

  const sessionId = `nutrition-${userId}-${Date.now()}`;

  await runner.sessionService.createSession({
    sessionId,
    userId,
    appName: "FaveFit",
    state: {},
  });

  const messageText = `以下の身体情報に基づいて栄養素目標を算出してJSONで答えてください:
${JSON.stringify(profile)}`;

  const userMessage = {
    role: "user",
    parts: [{ text: messageText }],
  };

  const result = await withLangfuseTrace(
    "calculate-nutrition",
    userId,
    profile,
    async (trace) => {
      const events = runner.runAsync({ userId, sessionId, newMessage: userMessage });

      const fullText = await processAdkEventsWithTrace(trace, events, userMessage, nutritionPlannerAgent.instruction as string);

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Failed to extract JSON:", fullText);
        throw new Error("AI応答からJSONを抽出できませんでした");
      }

      return JSON.parse(jsonMatch[0]);
    }
  );

  const nutrition = {
    dailyCalories: result.daily_calorie_target,
    pfc: {
      protein: result.protein_g,
      fat: result.fat_g,
      carbs: result.carbs_g,
    },
    strategySummary: result.strategy_summary,
  };

  await updateUserNutrition(userId, nutrition);

  return { nutrition };
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

  const runner = new InMemoryRunner({
    agent: preferenceLearnerAgent,
    appName: "FaveFit-Learner",
  });

  const sessionId = `learner-${userId}-${Date.now()}`;
  await runner.sessionService.createSession({
    sessionId,
    userId,
    appName: "FaveFit-Learner",
    state: {},
  });

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

  const userMessage = {
    role: "user",
    parts: [{ text: messageText }],
  };

  let fullText = "";
  const events = runner.runAsync({
    userId,
    sessionId,
    newMessage: userMessage,
  });

  for await (const event of events) {
    const content = stringifyContent(event);
    if (content) fullText += content;
  }

  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  const jsonString = jsonMatch ? jsonMatch[0] : fullText;
  const analysis: PreferenceAnalysis = JSON.parse(jsonString);

  await updateLearnedPreferences(
    userId,
    analysis.cuisineUpdates,
    analysis.flavorUpdates
  );

  return { analysis };
}
