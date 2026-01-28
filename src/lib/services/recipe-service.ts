/**
 * FaveFit v2 - レシピサービス
 * レシピ詳細取得・生成・差し替えに関するビジネスロジック
 */

import { buildRecipePrompt, runRecipeCreator } from "@/ai/agents/recipe-creator";
import { getOrCreateUser } from "@/lib/db/firestore/userRepository";
import { getPlan, updateMealSlot, swapMeal } from "@/lib/plan";
import { MealSlot } from "@/lib/schema";
import { addToHistory } from "@/lib/recipeHistory";

export interface GetRecipeDetailRequest {
  userId: string;
  planId: string;
  date: string;
  mealType: string;
}

export interface GetRecipeDetailResponse {
  recipe: MealSlot;
}

export interface SwapMealRequest {
  planId: string;
  date: string;
  mealType: string;
  newMeal: MealSlot;
  userId?: string;
}

/**
 * レシピ詳細を取得または生成
 */
export async function getRecipeDetail(
  request: GetRecipeDetailRequest
): Promise<GetRecipeDetailResponse> {
  const { userId, planId, date, mealType } = request;

  const plan = await getPlan(planId);
  if (!plan || !plan.days[date]) {
    throw new Error("プランまたは指定された日付が見つかりません");
  }

  const currentMeal = plan.days[date].meals[mealType as "breakfast" | "lunch" | "dinner"];
  if (!currentMeal) {
    throw new Error("指定された食事がプランに見つかりません");
  }

  // 既に詳細が存在する場合はそのまま返す
  if (
    currentMeal.ingredients &&
    currentMeal.ingredients.length > 0 &&
    currentMeal.steps &&
    currentMeal.steps.length > 0
  ) {
    return { recipe: currentMeal };
  }

  // 詳細を生成
  const userDoc = await getOrCreateUser(userId);
  const prompt = buildRecipePrompt(userDoc, currentMeal.title, currentMeal.nutrition);

  const aiResult = await runRecipeCreator(prompt);

  const ingredients = aiResult.ingredients;
  const steps = aiResult.instructions;

  const updates = {
    ingredients,
    steps: steps || [],
  };

  await updateMealSlot(
    planId,
    date,
    mealType as "breakfast" | "lunch" | "dinner",
    updates
  );

  return {
    recipe: {
      ...currentMeal,
      ...updates,
    },
  };
}

/**
 * レシピを差し替え
 */
export async function swapMealRecipe(
  request: SwapMealRequest
): Promise<void> {
  const { planId, date, mealType, newMeal, userId } = request;

  const mealSlot: MealSlot = {
    recipeId: newMeal.recipeId,
    title: newMeal.title,
    status: "swapped",
    nutrition: newMeal.nutrition,
    tags: newMeal.tags || [],
    ingredients: newMeal.ingredients || [],
    steps: newMeal.steps || [],
  };

  const mealTypeKey = mealType as "breakfast" | "lunch" | "dinner";
  await swapMeal(planId, date, mealTypeKey, mealSlot);

  // 履歴に追加
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
      // 履歴追加の失敗はエラーとして扱わない（非同期処理のため）
    }
  }
}
