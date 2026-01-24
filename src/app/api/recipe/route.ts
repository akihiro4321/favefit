/**
 * FaveFit v2 - レシピ関連API統合
 * POST /api/recipe?action=get-detail|swap-meal
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { recipeCreatorAgent, buildRecipePrompt } from "@/lib/agents/recipe-creator";
import { getOrCreateUser } from "@/lib/user";
import { getPlan, updateMealSlot, swapMeal } from "@/lib/plan";
import { MealSlot } from "@/lib/schema";
import { addToHistory } from "@/lib/recipeHistory";
import { withLangfuseTrace } from "@/lib/langfuse";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "get-detail";
    const body = await req.json();

    switch (action) {
      case "get-detail":
        return handleGetRecipeDetail(body);
      case "swap-meal":
        return handleSwapMeal(body);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error("Recipe API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * レシピ詳細取得/生成
 */
async function handleGetRecipeDetail(body: { userId: string; planId: string; date: string; mealType: string }) {
  const { userId, planId, date, mealType } = body;

  if (!userId || !planId || !date || !mealType) {
    return NextResponse.json(
      { error: "必要なパラメータ (userId, planId, date, mealType) が不足しています" },
      { status: 400 }
    );
  }

  const plan = await getPlan(planId);
  if (!plan || !plan.days[date]) {
    return NextResponse.json({ error: "プランまたは指定された日付が見つかりません" }, { status: 404 });
  }

  const currentMeal = plan.days[date].meals[mealType as "breakfast" | "lunch" | "dinner"];
  if (!currentMeal) {
    return NextResponse.json({ error: "指定された食事がプランに見つかりません" }, { status: 404 });
  }

  if (currentMeal.ingredients && currentMeal.ingredients.length > 0 && currentMeal.steps && currentMeal.steps.length > 0) {
    return NextResponse.json({ success: true, recipe: currentMeal });
  }

  const userDoc = await getOrCreateUser(userId);
  const prompt = buildRecipePrompt(userDoc, currentMeal.title, currentMeal.nutrition);

  const runner = new InMemoryRunner({
    agent: recipeCreatorAgent,
    appName: "FaveFit",
  });

  const sessionId = `recipe-gen-${userId}-${Date.now()}`;

  await runner.sessionService.createSession({
    sessionId,
    userId,
    appName: "FaveFit",
    state: {},
  });

  const userMessage = {
    role: "user",
    parts: [{ text: prompt }],
  };

  const aiResult = await withLangfuseTrace("generate-recipe-detail", userId, { recipeTitle: currentMeal.title }, async () => {
    let fullText = "";
    const events = runner.runAsync({ userId, sessionId, newMessage: userMessage });

    for await (const event of events) {
      const content = stringifyContent(event);
      if (content) fullText += content;
    }

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI応答からレシピ詳細JSONを抽出できませんでした");
    }

    return JSON.parse(jsonMatch[0]);
  });

  const ingredients = aiResult.ingredients.map((i: { name: string, amount: string }) => `${i.name}: ${i.amount}`);
  const steps = aiResult.instructions || aiResult.steps;

  const updates = {
    ingredients,
    steps: steps || [],
  };

  await updateMealSlot(planId, date, mealType as "breakfast" | "lunch" | "dinner", updates);

  return NextResponse.json({
    success: true,
    recipe: {
      ...currentMeal,
      ...updates
    }
  });
}

/**
 * レシピ差し替え
 */
async function handleSwapMeal(body: { planId: string; date: string; mealType: string; newMeal: MealSlot; userId?: string }) {
  const { planId, date, mealType, newMeal, userId } = body;

  if (!planId || !date || !mealType || !newMeal) {
    return NextResponse.json(
      { error: "必要なパラメータが不足しています" },
      { status: 400 }
    );
  }

  const mealSlot: MealSlot = {
    recipeId: newMeal.recipeId,
    title: newMeal.title,
    status: "swapped",
    nutrition: newMeal.nutrition,
    tags: newMeal.tags || [],
    ingredients: newMeal.ingredients || [],
    steps: newMeal.steps || [],
  };

  await swapMeal(planId, date, mealType, mealSlot);

  if (userId && newMeal.recipeId) {
    try {
      await addToHistory(userId, {
        id: newMeal.recipeId,
        title: newMeal.title,
        tags: newMeal.tags || [],
        ingredients: newMeal.ingredients || [],
        steps: newMeal.steps || [],
        nutrition: newMeal.nutrition,
      });
    } catch (error) {
      console.error("Error adding to history:", error);
    }
  }

  return NextResponse.json({
    success: true,
    message: "レシピを差し替えました",
  });
}
