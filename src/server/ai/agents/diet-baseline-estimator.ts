/**
 * Diet Baseline Estimator Agent
 * ユーザーの現状の食事内容から栄養価を推定する
 */

import { callModelWithSchema } from "../utils/agent-helpers";
import { NutritionValuesSchema, type NutritionValues } from "../types/common";
import {
  DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
  getDietBaselineEstimationPrompt,
} from "./prompts/diet-baseline-estimator";

/**
 * 食事内容から栄養価を推定するエージェントを実行
 */
export async function runDietBaselineEstimator(
  text: string,
  userId?: string,
): Promise<NutritionValues> {
  return await callModelWithSchema(
    DIET_BASELINE_ESTIMATOR_INSTRUCTIONS,
    getDietBaselineEstimationPrompt(text),
    NutritionValuesSchema,
    "flash-2.5",
    "diet-baseline-estimator",
    userId,
    "diet-analysis",
  );
}
