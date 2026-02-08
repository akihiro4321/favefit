/**
 * FaveFit - Meal Plan Generation Workflow
 *
 * 食事プラン生成ワークフロー
 * 複雑なプランニングロジックは `agents/plan-generator.ts` に委譲し、
 * ここではオーケストレーションのみを行う。
 */

import {
  runPlanGenerator,
  type PlanGeneratorInput,
} from "../agents/plan-generator";
import { DayPlan, UserNutrition, UserProfile } from "@/lib/schema";
import { MealTargetNutrition } from "@/lib/tools/mealNutritionCalculator";
import { dietBaselineService } from "../../services/diet-baseline-service";
import { estimateDailyDietBaseline } from "../functions/diet-estimator";

/**
 * ワークフロー入力
 */
export interface MealPlanWorkflowInput {
  input: PlanGeneratorInput;
  feedbackText?: string;
  mealTargets: MealTargetNutrition;
  dislikedIngredients: string[];
  userId?: string;
}

/**
 * ワークフロー結果
 */
export interface MealPlanWorkflowResult {
  days: Record<string, DayPlan>;
  isValid: boolean;
  invalidMealsCount: number;
}

/**
 * 食事プラン生成ワークフロー (メイン)
 */
export async function generateMealPlan(
  workflowInput: MealPlanWorkflowInput,
): Promise<MealPlanWorkflowResult> {
  const { input, feedbackText, mealTargets } = workflowInput;

  // 1. 現状の食生活を分析 (AI Function を直接呼び出し)
  console.log("[Workflow] Analyzing current diet intake...");
  const dietAnalysis = await estimateDailyDietBaseline(input.currentDiet);

  // 2. 適応型プランニング指示の生成 (Service層への依存をWorkflowで解決)
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
    dietAnalysis.total.calories, // 分析結果(合計カロリー)を渡す
  );

  console.log("[Workflow] Delegating plan generation to PlanGenerator Agent...");

  // 3. PlanGenerator Agent を実行
  // Agent内部で Anchor & Fill, Validation, Fix, Fallback が全て行われる
  const result = await runPlanGenerator(
    {
      ...input,
      adaptiveDirective, // 生成した指示を渡す
    },
    mealTargets,
    feedbackText,
  );

  console.log(
    `[Workflow] Agent completed. Valid: ${result.isValid}, Invalid/Fallback: ${result.invalidMealsCount}`,
  );

  return {
    days: result.days,
    isValid: result.isValid,
    invalidMealsCount: result.invalidMealsCount,
  };
}
