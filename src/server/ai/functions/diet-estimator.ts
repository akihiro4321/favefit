/**
 * Diet Baseline Estimator Function
 * ユーザーの現状の食事内容から栄養価を推定する関数
 */

import { z } from "zod";
import { callModelWithSchema } from "../utils/agent-helpers";
import { NutritionValuesSchema } from "../types/common";
import {
  DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
  getDailyDietBaselinePrompt,
} from "../prompts/functions/diet-estimator";
import { GEMINI_3_FLASH_MODEL } from "../config";
import { UserProfile } from "@/lib/schema";

/**
 * 出力スキーマ: 各食事スロットの栄養価と合計
 */
export const DailyDietAnalysisSchema = z.object({
  breakdown: z.object({
    breakfast: NutritionValuesSchema,
    lunch: NutritionValuesSchema,
    dinner: NutritionValuesSchema,
    snack: NutritionValuesSchema,
  }),
  total: NutritionValuesSchema,
});

export type DailyDietAnalysis = z.infer<typeof DailyDietAnalysisSchema>;

/**
 * 1日の食事内容から栄養価を推定する
 */
export async function estimateDailyDietBaseline(
  currentDiet: UserProfile["lifestyle"]["currentDiet"]
): Promise<DailyDietAnalysis> {
  return await callModelWithSchema(
    DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
    getDailyDietBaselinePrompt(currentDiet),
    DailyDietAnalysisSchema,
    GEMINI_3_FLASH_MODEL
  );
}
