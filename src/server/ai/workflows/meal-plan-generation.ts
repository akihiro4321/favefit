/**
 * FaveFit - Meal Plan Generation Workflow (Two-Stage)
 */

import { runPlanGenerator } from "../agents/plan-generator";
import {
  MealPlanWorkflowInput,
  MealPlanWorkflowResult,
} from "../types/workflow";
import { UserNutrition, UserProfile } from "@/lib/schema";
import { dietBaselineService } from "../../services/diet-baseline-service";
import { estimateDailyDietBaseline } from "../functions/diet-estimator";

/**
 * 食事プラン生成ワークフロー (メイン)
 */
export async function generateMealPlan(
  workflowInput: MealPlanWorkflowInput
): Promise<MealPlanWorkflowResult> {
  const { input, mealTargets } = workflowInput;

  // 1. 現状の食生活を分析
  console.log("[Workflow] Analyzing current diet intake...");
  const dietAnalysis = await estimateDailyDietBaseline(input.currentDiet);

  // 2. 適応型プランニング指示の生成
  const totalTargetCalories =
    mealTargets.breakfast.calories +
    mealTargets.lunch.calories +
    mealTargets.dinner.calories;

  const adaptiveDirective = await dietBaselineService.createAdaptiveDirective(
    {
      lifestyle: { currentDiet: input.currentDiet },
      physical: {
        goal:
          (input as unknown as { goal?: "lose" | "maintain" | "gain" }).goal ||
          "maintain",
      },
    } as unknown as UserProfile,
    { dailyCalories: totalTargetCalories } as unknown as UserNutrition,
    dietAnalysis.total.calories
  );

  console.log("[Workflow] Delegating to PlanGenerator Agent...");

  // 3. PlanGenerator Agent を実行
  const result = await runPlanGenerator(
    {
      ...input,
      adaptiveDirective,
    },
    mealTargets
  );

  return result;
}
