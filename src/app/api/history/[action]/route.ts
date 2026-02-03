/**
 * FaveFit v2 - レシピ履歴関連API統合 (コントローラー)
 * POST /api/history/add-to-favorites
 * POST /api/history/mark-as-cooked
 * POST /api/history/get-history
 * POST /api/history/get-favorites
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  addToFavorites,
  markAsCooked,
  getRecipeHistory,
  getFavorites,
} from "@/server/services/recipe-history-service";
import { HttpError, successResponse } from "@/server/api-utils";

const AddToFavoritesRequestSchema = z.object({
  userId: z.string().min(1),
  recipeId: z.string().min(1),
});

const MarkAsCookedRequestSchema = z.object({
  userId: z.string().min(1),
  recipeId: z.string().min(1),
});

const GetRecipeHistoryRequestSchema = z.object({
  userId: z.string().min(1),
  limitCount: z.number().optional(),
});

const GetFavoritesRequestSchema = z.object({
  userId: z.string().min(1),
});

/**
 * レシピ履歴関連API
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json();

    switch (action) {
      case "add-to-favorites": {
        const validated = AddToFavoritesRequestSchema.parse(body);
        await addToFavorites(validated);
        return successResponse({ ok: true });
      }
      case "mark-as-cooked": {
        const validated = MarkAsCookedRequestSchema.parse(body);
        await markAsCooked(validated);
        return successResponse({ ok: true });
      }
      case "get-history": {
        const validated = GetRecipeHistoryRequestSchema.parse(body);
        const result = await getRecipeHistory(validated);
        return successResponse(result);
      }
      case "get-favorites": {
        const validated = GetFavoritesRequestSchema.parse(body);
        const result = await getFavorites(validated);
        return successResponse(result);
      }
      default:
        return HttpError.badRequest(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error("History API error:", error);

    // Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return HttpError.badRequest("バリデーションエラー", {
        body: error.errors.map((e) => e.message),
      });
    }

    // ビジネスロジックエラー
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return HttpError.notFound(error.message);
      }
      return HttpError.internalError(error.message);
    }

    return HttpError.internalError("Unknown error");
  }
}
