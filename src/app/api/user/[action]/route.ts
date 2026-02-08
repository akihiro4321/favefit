/**
 * FaveFit v2 - ユーザー関連API統合 (コントローラー)
 * POST /api/user/calculate-nutrition
 * POST /api/user/learn-preference
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  calculateNutrition,
  learnPreference,
  updateNutritionPreferences,
  getUserProfile,
  updateUserProfile,
  completeOnboarding,
  setPlanCreating,
  updateLearnedPreferences
} from "@/server/services/user-service";
import { HttpError, successResponse } from "@/server/api-utils";
import {
  CalculateNutritionRequestSchema,
  UpdateNutritionPreferencesSchema,
  LearnPreferenceRequestSchema,
  UpdateLearnedPreferencesRequestSchema,
} from "@/lib/schemas/user";
import { UserProfile } from "@/lib/schema";

const GetUserProfileRequestSchema = z.object({
  userId: z.string().min(1),
});

const UpdateUserProfileRequestSchema = z.object({
  userId: z.string().min(1),
  profileData: z.custom<Partial<UserProfile>>(),
});

const CompleteOnboardingRequestSchema = z.object({
  userId: z.string().min(1),
});

const SetPlanCreatingRequestSchema = z.object({
  userId: z.string().min(1),
});

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
      case "get-profile": {
        const validated = GetUserProfileRequestSchema.parse(body);
        const result = await getUserProfile(validated);
        return successResponse(result);
      }
      case "update-profile": {
        const validated = UpdateUserProfileRequestSchema.parse(body);
        await updateUserProfile(validated);
        return successResponse({ ok: true });
      }
      case "complete-onboarding": {
        const validated = CompleteOnboardingRequestSchema.parse(body);
        await completeOnboarding(validated);
        return successResponse({ ok: true });
      }
      case "set-plan-creating": {
        const validated = SetPlanCreatingRequestSchema.parse(body);
        await setPlanCreating(validated);
        return successResponse({ ok: true });
      }
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
      case "update-learned-preferences": {
        const validated = UpdateLearnedPreferencesRequestSchema.parse(body);
        await updateLearnedPreferences(validated);
        return successResponse({ ok: true });
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
