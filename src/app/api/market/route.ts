/**
 * FaveFit v2 - 物価データ更新API (コントローラー)
 * POST /api/market
 * GET /api/market
 * 
 * 注意: 本番環境では Cloud Functions 等でバッチ実行する想定
 */

import { NextResponse } from "next/server";
import { updateMarketPrices, getMarketPrices } from "@/lib/services/market-service";
import { HttpError, successResponse } from "@/lib/api-utils";

/**
 * 物価データを更新
 */
export async function POST() {
  try {
    const result = await updateMarketPrices();
    return successResponse({
      ...result,
      message: "物価データを更新しました",
    });
  } catch (error: unknown) {
    console.error("Update market prices error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return HttpError.internalError(message);
  }
}

/**
 * 物価データを取得
 */
export async function GET() {
  try {
    const result = await getMarketPrices();

    if (!result) {
      return successResponse({
        cheapIngredients: [],
        message: "物価データがありません。POST で更新してください。",
      });
    }

    return successResponse(result);
  } catch (error: unknown) {
    console.error("Get market prices error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return HttpError.internalError(message);
  }
}
