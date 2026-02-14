/**
 * FaveFit - Plan Skeleton Generator Function
 */

import { callModelWithSchema } from "../utils/agent-helpers";
import { WeeklySkeleton, WeeklySkeletonSchema } from "../types/plan";
import { PlanGeneratorInput } from "../types/plan-input";
import {
  PLAN_SKELETON_GENERATOR_INSTRUCTIONS,
  getPlanSkeletonPrompt,
} from "../prompts/functions/plan-skeleton-generator";
import { AI_CONFIG } from "../config";

/**
 * 1週間分の献立スケルトンを生成
 */
export async function generatePlanSkeleton(
  input: PlanGeneratorInput,
  duration: number = 7
): Promise<WeeklySkeleton> {
  const prompt = getPlanSkeletonPrompt(input, duration);

  return await callModelWithSchema(
    PLAN_SKELETON_GENERATOR_INSTRUCTIONS,
    prompt,
    WeeklySkeletonSchema,
    AI_CONFIG.functions.planSkeleton
  );
}
