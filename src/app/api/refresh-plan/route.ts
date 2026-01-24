/**
 * FaveFit v2 - プランリフレッシュAPI
 * POST /api/refresh-plan
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { boredomAnalyzerAgent } from "@/lib/agents/boredom-analyzer";
import { planGeneratorAgent } from "@/lib/agents/plan-generator";
import { getOrCreateUser } from "@/lib/user";
import { getActivePlan, updatePlanDays } from "@/lib/plan";
import { DayPlan, MealSlot } from "@/lib/schema";
import { withLangfuseTrace } from "@/lib/langfuse";

interface MealInfo {
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  title: string;
  tags: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, forceDates } = body;

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

    // 直近の食事履歴を抽出
    const recentMeals: MealInfo[] = [];
    for (const [date, dayPlan] of Object.entries(activePlan.days)) {
      for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
        const meal = dayPlan.meals[mealType];
        recentMeals.push({
          date,
          mealType,
          title: meal.title,
          tags: meal.tags || [],
        });
      }
    }

    let datesToRefresh: string[] = forceDates || [];

    // 強制指定がない場合は Boredom Analyzer で分析
    if (!forceDates || forceDates.length === 0) {
      const analyzerRunner = new InMemoryRunner({
        agent: boredomAnalyzerAgent,
        appName: "FaveFit",
      });

      const analyzerSessionId = `boredom-${userId}-${Date.now()}`;

      await analyzerRunner.sessionService.createSession({
        sessionId: analyzerSessionId,
        userId,
        appName: "FaveFit",
        state: {},
      });

      const analyzerMessage = {
        role: "user",
        parts: [{
          text: `以下の食事履歴を分析して、飽き率と改善提案を教えてください。JSON形式で出力してください。

【食事履歴】
${JSON.stringify(recentMeals, null, 2)}

【ユーザー嗜好】
${JSON.stringify(userDoc.learnedPreferences, null, 2)}`
        }],
      };

      const analysisResult = await withLangfuseTrace("boredom-analysis", userId, { recentMealsCount: recentMeals.length }, async () => {
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

      // 飽き率が60以上、またはshouldRefreshがtrueならリフレッシュ
      if (analysisResult.boredomScore >= 60 || analysisResult.shouldRefresh) {
        datesToRefresh = analysisResult.refreshDates || [];
        
        // refreshDatesが空なら未来の日付を対象に
        if (datesToRefresh.length === 0) {
          const today = new Date().toISOString().split("T")[0];
          datesToRefresh = Object.keys(activePlan.days)
            .filter((d) => d > today)
            .slice(0, 3); // 最大3日
        }
      } else {
        // リフレッシュ不要
        return NextResponse.json({
          success: true,
          refreshed: false,
          boredomScore: analysisResult.boredomScore,
          analysis: analysisResult.analysis,
          message: "現在のプランは十分に変化があります",
        });
      }
    }

    // リフレッシュ対象日がなければ終了
    if (datesToRefresh.length === 0) {
      return NextResponse.json({
        success: true,
        refreshed: false,
        message: "リフレッシュ対象の日がありません",
      });
    }

    // Plan Generator で対象日のみ再生成
    const planRunner = new InMemoryRunner({
      agent: planGeneratorAgent,
      appName: "FaveFit",
    });

    const planSessionId = `refresh-${userId}-${Date.now()}`;

    await planRunner.sessionService.createSession({
      sessionId: planSessionId,
      userId,
      appName: "FaveFit",
      state: {},
    });

    const planMessage = {
      role: "user",
      parts: [{
        text: `以下の日付の食事プランを新しく生成してください。既存のメニューとは異なるものにしてください。JSON形式で出力してください。

【対象日】
${datesToRefresh.join(", ")}

【栄養目標】
- カロリー: ${userDoc.nutrition.dailyCalories} kcal
- タンパク質: ${userDoc.nutrition.pfc.protein}g
- 脂質: ${userDoc.nutrition.pfc.fat}g
- 炭水化物: ${userDoc.nutrition.pfc.carbs}g

【避けるべき食材】
${userDoc.learnedPreferences.dislikedIngredients.join(", ") || "なし"}

【既存のメニュー（これらとは異なるものを提案）】
${recentMeals.map((m) => m.title).join(", ")}

出力形式:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "isCheatDay": false,
      "breakfast": { "recipeId": "...", "title": "...", "tags": [...], "nutrition": {...} },
      "lunch": { ... },
      "dinner": { ... }
    }
  ]
}`
      }],
    };

    const planResult = await withLangfuseTrace("refresh-plan-generation", userId, { datesCount: datesToRefresh.length }, async () => {
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
        nutrition: { calories: number; protein: number; fat: number; carbs: number };
      }): MealSlot => ({
        recipeId: meal.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: meal.title,
        status: "planned",
        nutrition: meal.nutrition,
        tags: meal.tags || [],
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
      message: `${Object.keys(updatedDays).length}日分のプランをリフレッシュしました`,
    });
  } catch (error: unknown) {
    console.error("Refresh plan error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
