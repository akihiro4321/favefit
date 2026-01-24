/**
 * FaveFit v2 - プラン関連API統合 (コントローラー)
 * POST /api/plan/generate
 * POST /api/plan/refresh
 * POST /api/plan/refresh-with-feedback
 * POST /api/plan/suggest-boredom-recipes
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  generatePlan,
  refreshPlan,
  refreshPlanWithFeedback,
  suggestBoredomRecipes,
} from "@/lib/services/plan-service";
import { HttpError, successResponse } from "@/lib/api-utils";

const GeneratePlanRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
});

const RefreshPlanRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  forceDates: z.array(z.string()).optional(),
});

const RefreshPlanWithFeedbackRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  goodRecipes: z.array(z.string()).min(1, "goodRecipes は必須です"),
  badRecipes: z.array(z.string()).min(1, "badRecipes は必須です"),
});

const SuggestBoredomRecipesRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
});

/**
 * プラン関連API
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json();

    switch (action) {
      case "generate": {
        const validated = GeneratePlanRequestSchema.parse(body);
        const result = await generatePlan(validated);
        return successResponse(result);
      }
      case "refresh": {
        const validated = RefreshPlanRequestSchema.parse(body);
        const result = await refreshPlan(validated);
        return successResponse(result);
      }
      case "refresh-with-feedback": {
        const validated = RefreshPlanWithFeedbackRequestSchema.parse(body);
        const result = await refreshPlanWithFeedback(validated);
        return successResponse(result);
      }
      case "suggest-boredom-recipes": {
        const validated = SuggestBoredomRecipesRequestSchema.parse(body);
        const result = await suggestBoredomRecipes(validated);
        return successResponse(result);
      }
      default:
        return HttpError.badRequest(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error("Plan API error:", error);

    // Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return HttpError.badRequest("バリデーションエラー", {
        body: error.errors.map((e) => e.message),
      });
    }

    // ビジネスロジックエラー
    if (error instanceof Error) {
      if (
        error.message === "ユーザーが見つかりません" ||
        error.message === "アクティブなプランがありません"
      ) {
        return HttpError.notFound(error.message);
      }
      return HttpError.internalError(error.message);
    }

    return HttpError.internalError("Unknown error");
  }
}
