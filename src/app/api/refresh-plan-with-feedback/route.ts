/**
 * FaveFit v2 - フィードバック付きプランリフレッシュAPI
 * POST /api/refresh-plan-with-feedback
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { boredomAnalyzerAgent } from "@/lib/agents/boredom-analyzer";
import { planGeneratorAgent } from "@/lib/agents/plan-generator";
import { getOrCreateUser } from "@/lib/user";
import { getActivePlan, updatePlanDays } from "@/lib/plan";
import { DayPlan, MealSlot } from "@/lib/schema";
import { withLangfuseTrace } from "@/lib/langfuse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, goodRecipes, badRecipes } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    if (!goodRecipes || !badRecipes) {
      return NextResponse.json(
        { error: "goodRecipes と badRecipes は必須です" },
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

    // Boredom Analyzerで気分解析
    const analyzerRunner = new InMemoryRunner({
      agent: boredomAnalyzerAgent,
      appName: "FaveFit",
    });

    const analyzerSessionId = `boredom-feedback-${userId}-${Date.now()}`;

    await analyzerRunner.sessionService.createSession({
      sessionId: analyzerSessionId,
      userId,
      appName: "FaveFit",
      state: {},
    });

    const analyzerMessage = {
      role: "user",
      parts: [{
        text: `以下のgood/bad選択結果から、ユーザーの現在の気分・好みを解析し、新しい探索プロファイルを提案してください。

【good と選ばれたレシピ】
${JSON.stringify(goodRecipes, null, 2)}

【bad と選ばれたレシピ】
${JSON.stringify(badRecipes, null, 2)}

【現在の嗜好プロファイル】
${JSON.stringify(userDoc.learnedPreferences, null, 2)}`
      }],
    };

    const analysisResult = await withLangfuseTrace("boredom-feedback-analysis", userId, { 
      goodCount: goodRecipes.length,
      badCount: badRecipes.length 
    }, async () => {
      let analyzerText = "";
      const analyzerEvents = analyzerRunner.runAsync({
        userId,
        sessionId: analyzerSessionId,
        newMessage: analyzerMessage,
      });

      for await (const event of analyzerEvents) {
        const content = stringifyContent(event);
        if (content) analyzerText += content;
      }

      const analyzerMatch = analyzerText.match(/\{[\s\S]*\}/);
      if (!analyzerMatch) {
        throw new Error("Boredom analysis failed to return JSON");
      }
      return JSON.parse(analyzerMatch[0]);
    });

    // 未来の日付を取得
    const today = new Date().toISOString().split("T")[0];
    const futureDates = Object.keys(activePlan.days)
      .filter((d) => d > today)
      .slice(0, 7); // 最大7日分

    if (futureDates.length === 0) {
      return NextResponse.json({
        success: true,
        refreshed: false,
        message: "リフレッシュ対象の日がありません",
      });
    }

    // Plan Generatorで新プロファイルで再生成
    const planRunner = new InMemoryRunner({
      agent: planGeneratorAgent,
      appName: "FaveFit",
    });

    const planSessionId = `refresh-feedback-${userId}-${Date.now()}`;

    await planRunner.sessionService.createSession({
      sessionId: planSessionId,
      userId,
      appName: "FaveFit",
      state: {},
    });

    const planMessage = {
      role: "user",
      parts: [{
        text: `以下の日付の食事プランを、新しい探索プロファイルに基づいて生成してください。

【対象日】
${futureDates.join(", ")}

【栄養目標】
- カロリー: ${userDoc.nutrition.dailyCalories} kcal
- タンパク質: ${userDoc.nutrition.pfc.protein}g
- 脂質: ${userDoc.nutrition.pfc.fat}g
- 炭水化物: ${userDoc.nutrition.pfc.carbs}g

【探索プロファイル（優先する）】
- ジャンル: ${analysisResult.explorationProfile?.prioritizeCuisines?.join(", ") || "なし"}
- 味付け: ${analysisResult.explorationProfile?.prioritizeFlavors?.join(", ") || "なし"}

【避けるべきジャンル】
${analysisResult.explorationProfile?.avoidCuisines?.join(", ") || "なし"}

【避けるべき食材】
${userDoc.learnedPreferences.dislikedIngredients.join(", ") || "なし"}

出力形式:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "isCheatDay": false,
      "breakfast": { "recipeId": "...", "title": "...", "tags": [...], "nutrition": {...}, "ingredients": [...], "steps": [...] },
      "lunch": { ... },
      "dinner": { ... }
    }
  ]
}`
      }],
    };

    const planResult = await withLangfuseTrace("refresh-plan-with-feedback", userId, { datesCount: futureDates.length }, async () => {
      let planText = "";
      const planEvents = planRunner.runAsync({
        userId,
        sessionId: planSessionId,
        newMessage: planMessage,
      });

      for await (const event of planEvents) {
        const content = stringifyContent(event);
        if (content) planText += content;
      }

      const planMatch = planText.match(/\{[\s\S]*\}/);
      if (!planMatch) {
        throw new Error("New plan generation failed to return JSON");
      }

      return JSON.parse(planMatch[0]);
    });

    // 更新するDayPlanを構築
    const updatedDays: Record<string, DayPlan> = {};

    for (const day of planResult.days || []) {
      const date = day.date;

      const convertMeal = (meal: {
        recipeId?: string;
        title: string;
        tags?: string[];
        ingredients?: string[];
        steps?: string[];
        nutrition: { calories: number; protein: number; fat: number; carbs: number };
      }): MealSlot => ({
        recipeId: meal.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: meal.title,
        status: "planned",
        nutrition: meal.nutrition,
        tags: meal.tags || [],
        ingredients: meal.ingredients || [],
        steps: meal.steps || [],
      });

      const breakfast = convertMeal(day.breakfast);
      const lunch = convertMeal(day.lunch);
      const dinner = convertMeal(day.dinner);

      const totalNutrition = {
        calories: breakfast.nutrition.calories + lunch.nutrition.calories + dinner.nutrition.calories,
        protein: breakfast.nutrition.protein + lunch.nutrition.protein + dinner.nutrition.protein,
        fat: breakfast.nutrition.fat + lunch.nutrition.fat + dinner.nutrition.fat,
        carbs: breakfast.nutrition.carbs + lunch.nutrition.carbs + dinner.nutrition.carbs,
      };

      updatedDays[date] = {
        isCheatDay: day.isCheatDay || false,
        meals: { breakfast, lunch, dinner },
        totalNutrition,
      };
    }

    // Firestoreを更新
    await updatePlanDays(activePlan.id, updatedDays);

    return NextResponse.json({
      success: true,
      refreshed: true,
      refreshedDates: Object.keys(updatedDays),
      message: analysisResult.message || `${Object.keys(updatedDays).length}日分のプランをリフレッシュしました`,
    });
  } catch (error: unknown) {
    console.error("Refresh plan with feedback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
