/**
 * FaveFit v2 - ユーザー関連API統合 (コントローラー)
 * POST /api/user/calculate-nutrition
 * POST /api/user/learn-preference
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { calculateNutrition, learnPreference, updateNutritionPreferences } from "@/lib/services/user-service";
import { HttpError, successResponse } from "@/lib/api-utils";
import { NutritionPreferencesSchema } from "@/lib/tools/calculateMacroGoals";

const CalculateNutritionRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  profile: z.object({
    age: z
      .number({ required_error: "age は必須です" })
      .int("age は整数である必要があります")
      .min(1, "age は1以上である必要があります")
      .max(120, "age は120以下である必要があります"),
    gender: z.enum(["male", "female"], {
      required_error: "gender は必須です",
      invalid_type_error: "gender は male または female である必要があります",
    }),
    height_cm: z
      .number({ required_error: "height_cm は必須です" })
      .min(50, "height_cm は50以上である必要があります")
      .max(300, "height_cm は300以下である必要があります"),
    weight_kg: z
      .number({ required_error: "weight_kg は必須です" })
      .min(10, "weight_kg は10以上である必要があります")
      .max(500, "weight_kg は500以下である必要があります"),
    activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"], {
      required_error: "activity_level は必須です",
    }),
    goal: z.enum(["lose", "maintain", "gain"], {
      required_error: "goal は必須です",
    }),
  }),
  preferences: NutritionPreferencesSchema.optional(),
});

const UpdateNutritionPreferencesSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  preferences: NutritionPreferencesSchema,
});

const LearnPreferenceRequestSchema = z.object({
  userId: z.string().min(1),
  recipeId: z.string().min(1),
  feedback: z.object({
    wantToMakeAgain: z.boolean(),
    comment: z.string().optional(),
  }),
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
