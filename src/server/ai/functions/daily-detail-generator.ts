/**
 * FaveFit - Daily Detail Generator Function
 */

import { callModelWithSchema } from "../utils/agent-helpers";
import { DailyDetailedPlan, DailyDetailedPlanSchema, DailySkeleton } from "../types/plan-v2";
import {
  DAILY_DETAIL_GENERATOR_INSTRUCTIONS,
  getDailyDetailPrompt,
} from "../prompts/functions/daily-detail-generator";
import { GEMINI_3_FLASH_MODEL } from "../config";
import { MealTargetNutrition } from "@/lib/tools/mealNutritionCalculator";

/**
 * 1日分の詳細な献立を生成
 */
export async function generateDailyDetails(
  date: string,
  meals: DailySkeleton["meals"],
  targets: MealTargetNutrition,
  shoppingList: string[],
): Promise<DailyDetailedPlan> {
  const prompt = getDailyDetailPrompt({
    date,
    meals,
    targets,
    shoppingList,
  });

  return await callModelWithSchema(
    DAILY_DETAIL_GENERATOR_INSTRUCTIONS,
    prompt,
    DailyDetailedPlanSchema,
    GEMINI_3_FLASH_MODEL,
  );
}
