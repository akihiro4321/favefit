/**
 * FaveFit v2 - ユーザー関連API統合
 * POST /api/user?action=calculate-nutrition|learn-preference
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { nutritionPlannerAgent } from "@/lib/agents/nutrition-planner";
import { preferenceLearnerAgent, PreferenceAnalysis } from "@/lib/agents/preference-learner";
import { updateUserNutrition, getOrCreateUser, updateLearnedPreferences } from "@/lib/user";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { withValidation, successResponse } from "@/lib/api-utils";
import { withLangfuseTrace } from "@/lib/langfuse";

const CalculateNutritionRequest = z.object({
  userId: z.string().min(1, "userId は必須です"),
  profile: z.object({
    age: z
      .number({ required_error: "age は必須です" })
      .int("age は整数である必要があります")
      .min(1, "age は1以上である必要があります")
      .max(120, "age は120以下である必要があります"),
    gender: z.enum(["male", "female"], {
      required_error: "gender は必須です",
      invalid_type_error: "gender は male または female である必要があります",
    }),
    height_cm: z
      .number({ required_error: "height_cm は必須です" })
      .min(50, "height_cm は50以上である必要があります")
      .max(300, "height_cm は300以下である必要があります"),
    weight_kg: z
      .number({ required_error: "weight_kg は必須です" })
      .min(10, "weight_kg は10以上である必要があります")
      .max(500, "weight_kg は500以下である必要があります"),
    activity_level: z.enum(["low", "moderate", "high"], {
      required_error: "activity_level は必須です",
    }),
    goal: z.enum(["lose", "maintain", "gain"], {
      required_error: "goal は必須です",
    }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "calculate-nutrition";
    const body = await req.json();

    switch (action) {
      case "calculate-nutrition":
        try {
          return await handleCalculateNutrition(body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: "バリデーションエラー", details: error.errors },
              { status: 400 }
            );
          }
          throw error;
        }
      case "learn-preference":
        return handleLearnPreference(body);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error("User API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 栄養目標計算
 */
async function handleCalculateNutrition(body: unknown) {
  const validated = CalculateNutritionRequest.parse(body);
  const { userId, profile } = validated;

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

  const result = await withLangfuseTrace("calculate-nutrition", userId, profile, async () => {
    let fullText = "";
    const events = runner.runAsync({ userId, sessionId, newMessage: userMessage });

    for await (const event of events) {
      const content = stringifyContent(event);
      if (content) fullText += content;
    }

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON:", fullText);
      throw new Error("AI応答からJSONを抽出できませんでした");
    }

    return JSON.parse(jsonMatch[0]);
  });

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

  return successResponse({ nutrition });
}

/**
 * 好み学習
 */
async function handleLearnPreference(body: { userId: string; recipeId: string; feedback: { wantToMakeAgain: boolean; comment?: string } }) {
  const { userId, recipeId, feedback } = body;

  if (!userId || !recipeId || !feedback) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const recipeRef = doc(db, "recipeHistory", userId, "recipes", recipeId);
  const recipeSnap = await getDoc(recipeRef);

  if (!recipeSnap.exists()) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
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

  return NextResponse.json({ success: true, analysis });
}
