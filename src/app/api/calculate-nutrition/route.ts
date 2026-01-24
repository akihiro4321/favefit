/**
 * FaveFit v2 - 栄養目標計算API
 * POST /api/calculate-nutrition
 */

import { z } from "zod";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { nutritionPlannerAgent } from "@/lib/agents/nutrition-planner";
import { updateUserNutrition } from "@/lib/user";
import { withValidation, successResponse } from "@/lib/api-utils";
import { withLangfuseTrace } from "@/lib/langfuse";

// ========================================
// リクエストスキーマ (Spring Boot の DTO + @Valid に相当)
// ========================================

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

// ========================================
// API ハンドラ
// ========================================

/**
 * POST /api/calculate-nutrition
 * 
 * withValidation が自動でバリデーションを実行
 * - JSON パースエラー → 400 Bad Request
 * - バリデーションエラー → 400 Bad Request + 詳細
 * - 例外発生 → 500 Internal Server Error
 */
export const POST = withValidation(CalculateNutritionRequest, async ({ userId, profile }) => {
  // ここでは data は既にバリデーション済み＆型安全

  // 1. ADK Runner のセットアップ
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

  // 2. プロンプト構築
  const messageText = `以下の身体情報に基づいて栄養素目標を算出してJSONで答えてください:
${JSON.stringify(profile)}`;

  const userMessage = {
    role: "user",
    parts: [{ text: messageText }],
  };

  // Langfuse でトレースを開始
  const result = await withLangfuseTrace("calculate-nutrition", userId, profile, async (trace) => {
    let fullText = "";
    const events = runner.runAsync({ userId, sessionId, newMessage: userMessage });

    for await (const event of events) {
      const content = stringifyContent(event);
      if (content) fullText += content;
    }

    // 3. JSON をパース
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON:", fullText);
      throw new Error("AI応答からJSONを抽出できませんでした");
    }

    const aiResult = JSON.parse(jsonMatch[0]);
    return aiResult;
  });

  // 4. Firestore に保存
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

  // 5. 成功レスポンス
  return successResponse({ nutrition });
});
