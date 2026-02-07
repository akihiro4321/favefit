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
import { GEMINI_3_FLASH_MODEL } from "../config";

/**
 * 食事内容から栄養価を推定する
 */
export async function estimateDietBaseline(
  text: string,
): Promise<NutritionValues> {
  return await callModelWithSchema(
    DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
    getDietBaselineEstimationPrompt(text),
    NutritionValuesSchema,
    GEMINI_3_FLASH_MODEL,
  );
}
