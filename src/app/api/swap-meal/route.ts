/**
 * FaveFit v2 - レシピ差し替えAPI
 * POST /api/swap-meal
 */

import { NextRequest, NextResponse } from "next/server";
import { swapMeal } from "@/lib/plan";
import { MealSlot } from "@/lib/schema";
import { addToHistory } from "@/lib/recipeHistory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, date, mealType, newMeal, userId } = body;

    if (!planId || !date || !mealType || !newMeal) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    // レシピを差し替え
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

    // レシピ履歴に追加（userIdがある場合）
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
        // 履歴追加の失敗は無視
      }
    }

    return NextResponse.json({
      success: true,
      message: "レシピを差し替えました",
    });
  } catch (error: unknown) {
    console.error("Swap meal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
