/**
 * FaveFit v2 - 14日間プラン生成API
 * POST /api/generate-plan
 */

import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import { planGeneratorAgent, PlanGeneratorInput } from "@/lib/agents/plan-generator";
import { getOrCreateUser, setPlanCreating, setPlanCreated } from "@/lib/user";
import { createPlan, updatePlanStatus, getActivePlan } from "@/lib/plan";
import { createShoppingList } from "@/lib/shoppingList";
import { getFavorites } from "@/lib/recipeHistory";
import { DayPlan, MealSlot, ShoppingItem } from "@/lib/schema";
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

    // 既にプラン作成中の場合は重複作成を防止
    if (userDoc.planCreationStatus === "creating") {
      return NextResponse.json({
        success: true,
        status: "already_creating",
        message: "プランは現在作成中です。しばらくお待ちください。",
      });
    }

    // プラン作成開始をマーク（Fire and Forget パターンのため先にレスポンスを返す）
    await setPlanCreating(userId);

    // バックグラウンドでプラン生成を実行
    // Note: Edge Runtime/Serverless では完了前にタイムアウトする可能性があるため、
    // 本番環境では Cloud Functions や Cloud Run Jobs の利用を推奨
    generatePlanBackground(userId, userDoc).catch((error) => {
      console.error("Background plan generation failed:", error);
      // エラー時もステータスをクリア
      setPlanCreated(userId).catch(console.error);
    });

    // 即座にレスポンスを返す
    return NextResponse.json({
      success: true,
      status: "started",
      message: "プラン作成を開始しました。作成には1〜2分かかる場合があります。",
    });
  } catch (error: unknown) {
    console.error("Generate plan error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * バックグラウンドでプランを生成
 */
async function generatePlanBackground(
  userId: string,
  userDoc: Awaited<ReturnType<typeof getOrCreateUser>>
) {
  if (!userDoc) return;

  try {
    await withLangfuseTrace("generate-plan", userId, { nutrition: userDoc.nutrition, preferences: userDoc.learnedPreferences }, async () => {
      // お気に入りレシピを取得
      const favorites = await getFavorites(userId);
      const favoriteRecipes = favorites.map((f) => ({
        id: f.id,
        title: f.title,
        tags: f.tags,
      }));

      // 安価な食材リスト（将来的には marketPrices から取得）
      const cheapIngredients = ["キャベツ", "もやし", "鶏むね肉", "卵", "豆腐"];

      // 開始日を今日に設定
      const startDate = new Date().toISOString().split("T")[0];

      // 既存のアクティブプランがあればアーカイブ
      const existingPlan = await getActivePlan(userId);
      if (existingPlan) {
        await updatePlanStatus(existingPlan.id, "archived");
      }

      // Plan Generator エージェントへの入力
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

      // ADK Runner のセットアップ
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

      // プロンプト構築
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

      // JSONをパース
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Failed to extract JSON:", fullText);
        throw new Error("AI応答からJSONを抽出できませんでした");
      }

      const result = JSON.parse(jsonMatch[0]);

      // AIの出力をFirestoreスキーマに変換
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

      // Firestoreにプランを保存
      const planId = await createPlan(userId, startDate, days);

      // 買い物リストを保存
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
    // 完了時にステータスをクリア
    await setPlanCreated(userId);
  }
}
