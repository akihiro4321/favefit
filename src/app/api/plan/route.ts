/**
 * FaveFit v2 - プラン関連API統合
 * POST /api/plan?action=generate|refresh|refresh-with-feedback|suggest-boredom-recipes
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { planGeneratorAgent, PlanGeneratorInput } from "@/lib/agents/plan-generator";
import { boredomAnalyzerAgent } from "@/lib/agents/boredom-analyzer";
import { getOrCreateUser, setPlanCreating, setPlanCreated } from "@/lib/user";
import { createPlan, updatePlanStatus, getActivePlan, updatePlanDays } from "@/lib/plan";
import { createShoppingList } from "@/lib/shoppingList";
import { getFavorites } from "@/lib/recipeHistory";
import { DayPlan, MealSlot, ShoppingItem } from "@/lib/schema";
import { withLangfuseTrace } from "@/lib/langfuse";

interface MealInfo {
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  title: string;
  tags: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "generate";
    const body = await req.json();

    switch (action) {
      case "generate":
        return handleGeneratePlan(body);
      case "refresh":
        return handleRefreshPlan(body);
      case "refresh-with-feedback":
        return handleRefreshPlanWithFeedback(body);
      case "suggest-boredom-recipes":
        return handleSuggestBoredomRecipes(body);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error("Plan API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 14日間プラン生成
 */
async function handleGeneratePlan(body: { userId: string }) {
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId は必須です" },
      { status: 400 }
    );
  }

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 404 }
    );
  }

  if (userDoc.planCreationStatus === "creating") {
    return NextResponse.json({
      success: true,
      status: "already_creating",
      message: "プランは現在作成中です。しばらくお待ちください。",
    });
  }

  await setPlanCreating(userId);

  generatePlanBackground(userId, userDoc).catch((error) => {
    console.error("Background plan generation failed:", error);
    setPlanCreated(userId).catch(console.error);
  });

  return NextResponse.json({
    success: true,
    status: "started",
    message: "プラン作成を開始しました。作成には1〜2分かかる場合があります。",
  });
}

async function generatePlanBackground(
  userId: string,
  userDoc: Awaited<ReturnType<typeof getOrCreateUser>>
) {
  if (!userDoc) return;

  try {
    await withLangfuseTrace("generate-plan", userId, { nutrition: userDoc.nutrition, preferences: userDoc.learnedPreferences }, async () => {
      const favorites = await getFavorites(userId);
      const favoriteRecipes = favorites.map((f) => ({
        id: f.id,
        title: f.title,
        tags: f.tags,
      }));

      const cheapIngredients = ["キャベツ", "もやし", "鶏むね肉", "卵", "豆腐"];
      const startDate = new Date().toISOString().split("T")[0];

      const existingPlan = await getActivePlan(userId);
      if (existingPlan) {
        await updatePlanStatus(existingPlan.id, "archived");
      }

      const input: PlanGeneratorInput = {
        targetCalories: userDoc.nutrition.dailyCalories || 1800,
        pfc: userDoc.nutrition.pfc || { protein: 100, fat: 50, carbs: 200 },
        preferences: {
          cuisines: userDoc.learnedPreferences.cuisines,
          flavorProfile: userDoc.learnedPreferences.flavorProfile,
          dislikedIngredients: userDoc.learnedPreferences.dislikedIngredients,
        },
        favoriteRecipes,
        cheapIngredients,
        cheatDayFrequency: userDoc.profile.cheatDayFrequency || "weekly",
        startDate,
      };

      const runner = new InMemoryRunner({
        agent: planGeneratorAgent,
        appName: "FaveFit",
      });

      const sessionId = `plan-gen-${userId}-${Date.now()}`;

      await runner.sessionService.createSession({
        sessionId,
        userId,
        appName: "FaveFit",
        state: {},
      });

      const messageText = `以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。必ずJSON形式で出力してください。

【ユーザー情報】
${JSON.stringify(input, null, 2)}`;

      const userMessage = {
        role: "user",
        parts: [{ text: messageText }],
      };

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

      const result = JSON.parse(jsonMatch[0]);

      const days: Record<string, DayPlan> = {};
      
      for (const day of result.days || []) {
        const date = day.date;
        
        const convertMeal = (meal: {
          recipeId: string;
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

        days[date] = {
          isCheatDay: day.isCheatDay || false,
          meals: { breakfast, lunch, dinner },
          totalNutrition,
        };
      }

      const planId = await createPlan(userId, startDate, days);

      const shoppingItems: ShoppingItem[] = (result.shoppingList || []).map(
        (item: { ingredient: string; amount: string; category: string }) => ({
          ingredient: item.ingredient,
          amount: item.amount,
          category: item.category || "その他",
          checked: false,
        })
      );

      await createShoppingList(planId, shoppingItems);

      console.log(`Plan created successfully for user ${userId}: planId=${planId}`);
      return { planId, daysCount: Object.keys(days).length };
    });
  } finally {
    await setPlanCreated(userId);
  }
}

/**
 * プランリフレッシュ（自動分析）
 */
async function handleRefreshPlan(body: { userId: string; forceDates?: string[] }) {
  const { userId, forceDates } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId は必須です" },
      { status: 400 }
    );
  }

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 404 }
    );
  }

  const activePlan = await getActivePlan(userId);
  if (!activePlan) {
    return NextResponse.json(
      { error: "アクティブなプランがありません" },
      { status: 404 }
    );
  }

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

    if (analysisResult.boredomScore >= 60 || analysisResult.shouldRefresh) {
      datesToRefresh = analysisResult.refreshDates || [];
      
      if (datesToRefresh.length === 0) {
        const today = new Date().toISOString().split("T")[0];
        datesToRefresh = Object.keys(activePlan.days)
          .filter((d) => d > today)
          .slice(0, 3);
      }
    } else {
      return NextResponse.json({
        success: true,
        refreshed: false,
        boredomScore: analysisResult.boredomScore,
        analysis: analysisResult.analysis,
        message: "現在のプランは十分に変化があります",
      });
    }
  }

  if (datesToRefresh.length === 0) {
    return NextResponse.json({
      success: true,
      refreshed: false,
      message: "リフレッシュ対象の日がありません",
    });
  }

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

  await updatePlanDays(activePlan.id, updatedDays);

  return NextResponse.json({
    success: true,
    refreshed: true,
    refreshedDates: Object.keys(updatedDays),
    message: `${Object.keys(updatedDays).length}日分のプランをリフレッシュしました`,
  });
}

/**
 * フィードバック付きプランリフレッシュ
 */
async function handleRefreshPlanWithFeedback(body: { userId: string; goodRecipes: string[]; badRecipes: string[] }) {
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

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 404 }
    );
  }

  const activePlan = await getActivePlan(userId);
  if (!activePlan) {
    return NextResponse.json(
      { error: "アクティブなプランがありません" },
      { status: 404 }
    );
  }

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

  const today = new Date().toISOString().split("T")[0];
  const futureDates = Object.keys(activePlan.days)
    .filter((d) => d > today)
    .slice(0, 7);

  if (futureDates.length === 0) {
    return NextResponse.json({
      success: true,
      refreshed: false,
      message: "リフレッシュ対象の日がありません",
    });
  }

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

  await updatePlanDays(activePlan.id, updatedDays);

  return NextResponse.json({
    success: true,
    refreshed: true,
    refreshedDates: Object.keys(updatedDays),
    message: analysisResult.message || `${Object.keys(updatedDays).length}日分のプランをリフレッシュしました`,
  });
}

/**
 * 飽き防止用5レシピ提案
 */
async function handleSuggestBoredomRecipes(body: { userId: string }) {
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId は必須です" },
      { status: 400 }
    );
  }

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 404 }
    );
  }

  const activePlan = await getActivePlan(userId);
  if (!activePlan) {
    return NextResponse.json(
      { error: "アクティブなプランがありません" },
      { status: 404 }
    );
  }

  const existingTitles = new Set<string>();
  for (const dayPlan of Object.values(activePlan.days)) {
    for (const meal of Object.values(dayPlan.meals)) {
      existingTitles.add(meal.title);
    }
  }

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

  const recipes = (result.recipes || []).slice(0, 5);

  return NextResponse.json({
    success: true,
    recipes,
  });
}
