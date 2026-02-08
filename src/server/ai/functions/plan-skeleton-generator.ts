/**
 * FaveFit - Plan Skeleton Generator Function
 */

import { callModelWithSchema } from "../utils/agent-helpers";
import { WeeklySkeleton, WeeklySkeletonSchema } from "../types/plan-v2";
import { PlanGeneratorInput } from "../agents/plan-generator";
import {
  PLAN_SKELETON_GENERATOR_INSTRUCTIONS,
  getPlanSkeletonPrompt,
} from "../prompts/functions/plan-skeleton-generator";
import { GEMINI_3_FLASH_MODEL } from "../config";

/**
 * 1週間分の献立スケルトンを生成
 */
export async function generatePlanSkeleton(
  input: PlanGeneratorInput,
  duration: number = 7,
): Promise<WeeklySkeleton> {
  const prompt = getPlanSkeletonPrompt(input, duration);

  return await callModelWithSchema(
    PLAN_SKELETON_GENERATOR_INSTRUCTIONS,
    prompt,
    WeeklySkeletonSchema,
    GEMINI_3_FLASH_MODEL,
  );
}
