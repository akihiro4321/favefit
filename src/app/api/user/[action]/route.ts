/**
 * FaveFit v2 - ユーザー関連API統合 (コントローラー)
 * POST /api/user/calculate-nutrition
 * POST /api/user/learn-preference
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { calculateNutrition, learnPreference, updateNutritionPreferences } from "@/lib/services/user-service";
import { HttpError, successResponse } from "@/lib/api-utils";
import {
  CalculateNutritionRequestSchema,
  UpdateNutritionPreferencesSchema,
  LearnPreferenceRequestSchema,
} from "@/lib/schemas/user";

/**
 * ユーザー関連API
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json();

    switch (action) {
      case "calculate-nutrition": {
        const validated = CalculateNutritionRequestSchema.parse(body);
        const result = await calculateNutrition(validated);
        return successResponse(result);
      }
      case "update-nutrition-preferences": {
        const validated = UpdateNutritionPreferencesSchema.parse(body);
        await updateNutritionPreferences(validated.userId, validated.preferences);
        return successResponse({ ok: true });
      }
      case "learn-preference": {
        const validated = LearnPreferenceRequestSchema.parse(body);
        const result = await learnPreference(validated);
        return successResponse(result);
      }
      default:
        return HttpError.badRequest(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error("User API error:", error);

    // Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return HttpError.badRequest("バリデーションエラー", {
        body: error.errors.map((e) => e.message),
      });
    }

    // ビジネスロジックエラー
    if (error instanceof Error) {
      if (error.message === "ユーザーが見つかりません" || error.message === "Recipe not found") {
        return HttpError.notFound(error.message);
      }
      return HttpError.internalError(error.message);
    }

    return HttpError.internalError("Unknown error");
  }
}
