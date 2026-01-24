/**
 * FaveFit v2 - メニュー提案API
 * POST /api/menu
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { menuAdjusterAgent, MenuAdjusterInput } from "@/lib/agents/menu-adjuster";
import { getOrCreateUser } from "@/lib/user";
import { withLangfuseTrace } from "@/lib/langfuse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ingredients, comment, previousSuggestions } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "ingredients は必須です（食材の配列）" },
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
      previousSuggestions: previousSuggestions || undefined,
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

    const result = await withLangfuseTrace("suggest-menu", userId, { ingredients, comment }, async () => {
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

    const suggestions = (result.suggestions || []).map((s: {
      recipeId?: string;
      title: string;
      description: string;
      tags?: string[];
      ingredients?: string[];
      additionalIngredients?: string[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    }) => ({
      recipeId: s.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: s.title,
      description: s.description,
      tags: s.tags || [],
      ingredients: s.ingredients || [],
      additionalIngredients: s.additionalIngredients || [],
      steps: s.steps || [],
      nutrition: s.nutrition,
    }));

    return NextResponse.json({
      success: true,
      suggestions,
      message: result.message || "レシピを提案しました！",
    });
  } catch (error: unknown) {
    console.error("Suggest menu error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
