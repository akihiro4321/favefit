/**
 * Diet Baseline Estimator Function
 * ユーザーの現状の食事内容から栄養価を推定する関数
 */

import { callModelWithSchema } from "../utils/agent-helpers";
import { NutritionValuesSchema, type NutritionValues } from "../types/common";
import {
  DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
  getDietBaselineEstimationPrompt,
} from "../prompts/functions/diet-estimator";

/**
 * 食事内容から栄養価を推定する
 */
export async function estimateDietBaseline(
  text: string,
  userId?: string,
): Promise<NutritionValues> {
  return await callModelWithSchema(
    DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
    getDietBaselineEstimationPrompt(text),
    NutritionValuesSchema,
    "flash-2.5",
    "diet-estimator",
    userId,
    "diet-analysis",
  );
}
