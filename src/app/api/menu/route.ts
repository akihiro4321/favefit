/**
 * FaveFit v2 - メニュー提案API (コントローラー)
 * POST /api/menu
 */

import { NextRequest } from "next/server";
import { suggestMenu } from "@/lib/services/menu-service";
import { HttpError, successResponse, withValidation } from "@/lib/api-utils";
import { z } from "zod";

const SuggestMenuRequestSchema = z.object({
  userId: z.string().min(1, "userId は必須です"),
  ingredients: z
    .array(z.string())
    .min(1, "ingredients は必須です（食材の配列）"),
  comment: z.string().optional(),
  previousSuggestions: z.array(z.unknown()).optional(),
});

/**
 * メニューを提案
 */
export const POST = withValidation(
  SuggestMenuRequestSchema,
  async (data) => {
    try {
      const result = await suggestMenu(data);
      return successResponse(result);
    } catch (error: unknown) {
      console.error("Suggest menu error:", error);
      if (error instanceof Error && error.message === "ユーザーが見つかりません") {
        return HttpError.notFound(error.message);
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      return HttpError.internalError(message);
    }
  }
);
