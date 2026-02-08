/**
 * FaveFit - Meal Plan Generation Workflow V2 (Two-Stage)
 */

import { runPlanGeneratorV2 } from "../agents/plan-generator-v2";
import { MealPlanWorkflowInput, MealPlanWorkflowResult } from "./meal-plan-generation";
import { UserNutrition, UserProfile } from "@/lib/schema";
import { dietBaselineService } from "../../services/diet-baseline-service";
import { estimateDailyDietBaseline } from "../functions/diet-estimator";

/**
 * 食事プラン生成ワークフロー V2 (メイン)
 */
export async function generateMealPlanV2(
  workflowInput: MealPlanWorkflowInput,
): Promise<MealPlanWorkflowResult> {
  const { input, mealTargets } = workflowInput;

  // 1. 現状の食生活を分析
  console.log("[WorkflowV2] Analyzing current diet intake...");
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
    dietAnalysis.total.calories,
  );

  console.log("[WorkflowV2] Delegating to PlanGeneratorV2 Agent...");

  // 3. PlanGenerator Agent V2 を実行
  const result = await runPlanGeneratorV2(
    {
      ...input,
      adaptiveDirective,
    },
    mealTargets
  );

  return result;
}
