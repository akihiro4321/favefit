/**
 * FaveFit v2 - レシピ関連API統合 (コントローラー)
 * POST /api/recipe/get-detail
 * POST /api/recipe/swap-meal
 */

import { NextRequest } from "next/server";
import {
  getRecipeDetail,
  swapMealRecipe,
  getSavedRecipe,
  getSavedRecipes
} from "@/server/services/recipe-service";
import { HttpError, successResponse } from "@/server/api-utils";
import { MealSlot } from "@/lib/schema";
import { z } from "zod";

const GetRecipeDetailRequestSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  date: z.string().min(1),
  mealType: z.string().min(1),
});

const SwapMealRequestSchema = z.object({
  planId: z.string().min(1),
  date: z.string().min(1),
  mealType: z.string().min(1),
  newMeal: z.custom<MealSlot>(),
  userId: z.string().optional(),
});

const GetSavedRecipeRequestSchema = z.object({
  userId: z.string().min(1),
  recipeId: z.string().min(1),
});

const GetSavedRecipesRequestSchema = z.object({
  userId: z.string().min(1),
  pageSize: z.number().optional(),
  page: z.number().optional(),
});

/**
 * レシピ関連API
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json();

    switch (action) {
      case "get-detail": {
        const validated = GetRecipeDetailRequestSchema.parse(body);
        const result = await getRecipeDetail(validated);
        return successResponse(result);
      }
      case "swap-meal": {
        const validated = SwapMealRequestSchema.parse(body);
        await swapMealRecipe(validated);
        return successResponse({ message: "レシピを差し替えました" });
      }
      case "get-saved": {
        const validated = GetSavedRecipeRequestSchema.parse(body);
        const result = await getSavedRecipe(validated);
        return successResponse(result);
      }
      case "get-saved-list": {
        const validated = GetSavedRecipesRequestSchema.parse(body);
        const result = await getSavedRecipes(validated);
        return successResponse(result);
      }
      default:
        return HttpError.badRequest(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error("Recipe API error:", error);
    
    // Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return HttpError.badRequest("バリデーションエラー", {
        body: error.errors.map((e) => e.message),
      });
    }

    // ビジネスロジックエラー
    if (error instanceof Error) {
      if (error.message.includes("見つかりません")) {
        return HttpError.notFound(error.message);
      }
      return HttpError.internalError(error.message);
    }

    return HttpError.internalError("Unknown error");
  }
}
