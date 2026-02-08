/**
 * FaveFit - AI Workflow Type Definitions
 */

import { DayPlan } from "@/lib/schema";
import { MealTargetNutrition } from "@/lib/tools/mealNutritionCalculator";
import { PlanGeneratorInput } from "./plan-input";

/**
 * 食事プラン生成ワークフロー入力
 */
export interface MealPlanWorkflowInput {
  input: PlanGeneratorInput;
  feedbackText?: string;
  mealTargets: MealTargetNutrition;
  dislikedIngredients: string[];
  userId?: string;
  duration?: number;
}

/**
 * 食事プラン生成ワークフロー結果
 */
export interface MealPlanWorkflowResult {
  days: Record<string, DayPlan>;
  isValid: boolean;
  invalidMealsCount: number;
}
