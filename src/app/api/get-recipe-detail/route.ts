/**
 * FaveFit v2 - レシピ詳細取得/生成API
 * POST /api/get-recipe-detail
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { recipeCreatorAgent, buildRecipePrompt } from "@/lib/agents/recipe-creator";
import { getOrCreateUser } from "@/lib/user";
import { getPlan, updateMealSlot } from "@/lib/plan";
import { withLangfuseTrace } from "@/lib/langfuse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, planId, date, mealType } = body;

    if (!userId || !planId || !date || !mealType) {
      return NextResponse.json(
        { error: "必要なパラメータ (userId, planId, date, mealType) が不足しています" },
        { status: 400 }
      );
    }

    // 1. 既存のプランから食事情報を取得
    const plan = await getPlan(planId);
    if (!plan || !plan.days[date]) {
      return NextResponse.json({ error: "プランまたは指定された日付が見つかりません" }, { status: 404 });
    }

    const currentMeal = plan.days[date].meals[mealType as "breakfast" | "lunch" | "dinner"];
    if (!currentMeal) {
      return NextResponse.json({ error: "指定された食事がプランに見つかりません" }, { status: 404 });
    }

    // 2. すでに詳細がある場合はそれを返す
    if (currentMeal.ingredients && currentMeal.ingredients.length > 0 && currentMeal.steps && currentMeal.steps.length > 0) {
      return NextResponse.json({ success: true, recipe: currentMeal });
    }

    // 3. 詳細がない場合は AI で生成
    const userDoc = await getOrCreateUser(userId);
    
    // プロンプト構築 (レシピ名を「気分」として渡す)
    const prompt = buildRecipePrompt(userDoc, currentMeal.title, currentMeal.nutrition);

    // ADK Runner のセットアップ
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

    // Langfuse トレース
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

    // 4. Firestore に詳細を保存
    const ingredients = aiResult.ingredients.map((i: { name: string, amount: string }) => `${i.name}: ${i.amount}`);
    const steps = aiResult.instructions || aiResult.steps; // recipe-creator は instructions を使う場合がある

    const updates = {
      ingredients,
      steps: steps || [],
    };

    await updateMealSlot(planId, date, mealType as "breakfast" | "lunch" | "dinner", updates);

    // 5. 更新された情報を返却
    return NextResponse.json({
      success: true,
      recipe: {
        ...currentMeal,
        ...updates
      }
    });

  } catch (error: unknown) {
    console.error("Get recipe detail error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
