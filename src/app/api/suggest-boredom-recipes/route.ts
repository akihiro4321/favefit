/**
 * FaveFit v2 - 飽き防止用5レシピ提案API
 * POST /api/suggest-boredom-recipes
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { planGeneratorAgent } from "@/lib/agents/plan-generator";
import { getOrCreateUser } from "@/lib/user";
import { getActivePlan } from "@/lib/plan";
import { withLangfuseTrace } from "@/lib/langfuse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const userDoc = await getOrCreateUser(userId);
    if (!userDoc) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // アクティブプランを取得
    const activePlan = await getActivePlan(userId);
    if (!activePlan) {
      return NextResponse.json(
        { error: "アクティブなプランがありません" },
        { status: 404 }
      );
    }

    // 既存のレシピタイトルを収集（重複を避けるため）
    const existingTitles = new Set<string>();
    for (const dayPlan of Object.values(activePlan.days)) {
      for (const meal of Object.values(dayPlan.meals)) {
        existingTitles.add(meal.title);
      }
    }

    // Plan Generatorで新ジャンルから5レシピを生成
    const planRunner = new InMemoryRunner({
      agent: planGeneratorAgent,
      appName: "FaveFit",
    });

    const sessionId = `boredom-suggest-${userId}-${Date.now()}`;

    await planRunner.sessionService.createSession({
      sessionId,
      userId,
      appName: "FaveFit",
      state: {},
    });

    const message = {
      role: "user",
      parts: [{
        text: `飽き防止のため、既存のプランとは異なる新ジャンル・新テイストのレシピを5つ提案してください。
既存のレシピとは全く異なる方向性のものを選んでください。

【栄養目標】
- カロリー: ${userDoc.nutrition.dailyCalories} kcal/日
- タンパク質: ${userDoc.nutrition.pfc.protein}g
- 脂質: ${userDoc.nutrition.pfc.fat}g
- 炭水化物: ${userDoc.nutrition.pfc.carbs}g

【避けるべき食材】
${userDoc.learnedPreferences.dislikedIngredients.join(", ") || "なし"}

【既存のレシピ（これらとは異なるものを提案）】
${Array.from(existingTitles).slice(0, 20).join(", ")}

【出力形式】
以下のJSON形式で5つのレシピを出力してください：
{
  "recipes": [
    {
      "recipeId": "recipe-1",
      "title": "レシピ名",
      "description": "なぜこのレシピを提案したか（新ジャンル・新テイストの説明）",
      "tags": ["タグ1", "タグ2"],
      "nutrition": {
        "calories": 500,
        "protein": 30,
        "fat": 15,
        "carbs": 50
      }
    }
  ]
}`
      }],
    };

    const result = await withLangfuseTrace("boredom-recipe-suggestions", userId, {}, async () => {
      let planText = "";
      const planEvents = planRunner.runAsync({
        userId,
        sessionId,
        newMessage: message,
      });

      for await (const event of planEvents) {
        const content = stringifyContent(event);
        if (content) planText += content;
      }

      const planMatch = planText.match(/\{[\s\S]*\}/);
      if (!planMatch) {
        throw new Error("Recipe suggestions failed to return JSON");
      }

      return JSON.parse(planMatch[0]);
    });

    // 5レシピに制限
    const recipes = (result.recipes || []).slice(0, 5);

    return NextResponse.json({
      success: true,
      recipes,
    });
  } catch (error: unknown) {
    console.error("Suggest boredom recipes error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
