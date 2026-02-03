/**
 * FaveFit v2 - 買い物リスト関連API統合 (コントローラー)
 * POST /api/shopping/get-list
 * POST /api/shopping/toggle-item
 * POST /api/shopping/get-by-category
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  getShoppingList,
  toggleItemCheck,
  getItemsByCategory,
} from "@/server/services/shopping-list-service";
import { HttpError, successResponse } from "@/server/api-utils";

const GetShoppingListRequestSchema = z.object({
  planId: z.string().min(1),
});

const ToggleItemCheckRequestSchema = z.object({
  planId: z.string().min(1),
  itemIndex: z.number().min(0),
  checked: z.boolean(),
});

const GetItemsByCategoryRequestSchema = z.object({
  planId: z.string().min(1),
});

/**
 * 買い物リスト関連API
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json();

    switch (action) {
      case "get-list": {
        const validated = GetShoppingListRequestSchema.parse(body);
        const result = await getShoppingList(validated);
        return successResponse(result);
      }
      case "toggle-item": {
        const validated = ToggleItemCheckRequestSchema.parse(body);
        await toggleItemCheck(validated);
        return successResponse({ ok: true });
      }
      case "get-by-category": {
        const validated = GetItemsByCategoryRequestSchema.parse(body);
        const result = await getItemsByCategory(validated);
        return successResponse(result);
      }
      default:
        return HttpError.badRequest(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error("Shopping API error:", error);

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
