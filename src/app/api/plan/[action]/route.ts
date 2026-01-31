/**
 * FaveFit v2 - プラン関連API統合 (コントローラー)
 * POST /api/plan/generate
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  generatePlan,
  approvePlan,
  rejectPlan,
} from "@/lib/services/plan-service";
import { HttpError, successResponse } from "@/lib/api-utils";

const GeneratePlanRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
});



const ApprovePlanRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  planId: z.string().min(1, "planId は必須です"),
});

const RejectPlanRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  planId: z.string().min(1, "planId は必須です"),
  feedback: z.string().optional(),
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
      case "approve": {
        const validated = ApprovePlanRequestSchema.parse(body);
        const result = await approvePlan(validated);
        return successResponse(result);
      }
      case "reject": {
        const validated = RejectPlanRequestSchema.parse(body);
        const result = await rejectPlan(validated);
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
