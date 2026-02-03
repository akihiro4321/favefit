/**
 * FaveFit v2 - フィードバック保存API
 * POST /api/feedback/save
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { saveFeedback } from "@/server/services/feedback-service";
import { HttpError, successResponse } from "@/server/api-utils";

const SaveFeedbackRequestSchema = z.object({
  userId: z.string().min(1),
  recipeId: z.string().min(1),
  cooked: z.boolean(),
  ratings: z.object({
    overall: z.number(),
    taste: z.number(),
    ease: z.number(),
    satisfaction: z.number(),
  }),
  repeatPreference: z.enum(["definitely", "sometimes", "never"]),
  comment: z.string(),
});

/**
 * フィードバック保存API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = SaveFeedbackRequestSchema.parse(body);
    const result = await saveFeedback(validated);
    return successResponse(result);
  } catch (error: unknown) {
    console.error("Feedback API error:", error);

    // Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return HttpError.badRequest("バリデーションエラー", {
        body: error.errors.map((e) => e.message),
      });
    }

    // ビジネスロジックエラー
    if (error instanceof Error) {
      return HttpError.internalError(error.message);
    }

    return HttpError.internalError("Unknown error");
  }
}
