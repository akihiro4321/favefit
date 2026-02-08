/**
 * FaveFit - Plan Generator Agent V2 (Two-Stage)
 */

import { PlanGeneratorInput } from "./plan-generator";
import { MealTargetNutrition, NutritionValues } from "@/lib/tools/mealNutritionCalculator";
import { DayPlan, MealSlot } from "@/lib/schema";
import { generatePlanSkeleton } from "../functions/plan-skeleton-generator";
import { generateDailyDetails } from "../functions/daily-detail-generator";
import { recalculateDayNutrition } from "@/lib/tools/nutritionValidator";

/**
 * 栄養目標をスケルトンのカロリーに合わせて比例調整するヘルパー
 */
function adjustTargetsToSkeleton(
  skeletonMeal: { approxCalories: number },
  originalTarget: NutritionValues,
): NutritionValues {
  const ratio = originalTarget.calories > 0 
    ? skeletonMeal.approxCalories / originalTarget.calories 
    : 1;

  return {
    calories: skeletonMeal.approxCalories,
    protein: Math.round(originalTarget.protein * ratio),
    fat: Math.round(originalTarget.fat * ratio),
    carbs: Math.round(originalTarget.carbs * ratio),
  };
}

/**
 * 2段階生成フローを実行する新エージェント
 */
export async function runPlanGeneratorV2(
  input: PlanGeneratorInput,
  mealTargets: MealTargetNutrition,
): Promise<{
  days: Record<string, DayPlan>;
  isValid: boolean;
  invalidMealsCount: number;
}> {
  // Phase 1: スケルトン生成
  console.log("[PlanGeneratorV2] Phase 1: Generating weekly skeleton with ingredient pools...");
  const skeleton = await generatePlanSkeleton(input);

  // Phase 2: 詳細生成（並列実行）
  console.log("[PlanGeneratorV2] Phase 2: Generating daily details in parallel...");

  const dayPromises = skeleton.days.map(async (daySkeleton) => {
    // この日が属する食材プールを探す
    const pool = skeleton.ingredientPools.find(p => {
      const [start, end] = p.period.split(" to ");
      return daySkeleton.date >= start && daySkeleton.date <= end;
    }) || skeleton.ingredientPools[0];

    // その日のPFCターゲットを調整
    const dailyTargets: Record<string, NutritionValues> = {
      breakfast: adjustTargetsToSkeleton(daySkeleton.meals.breakfast, mealTargets.breakfast),
      lunch: adjustTargetsToSkeleton(daySkeleton.meals.lunch, mealTargets.lunch),
      dinner: adjustTargetsToSkeleton(daySkeleton.meals.dinner, mealTargets.dinner),
    };

    if (daySkeleton.meals.snack) {
      dailyTargets.snack = {
        calories: daySkeleton.meals.snack.approxCalories,
        protein: Math.round(daySkeleton.meals.snack.approxCalories * 0.1),
        fat: Math.round(daySkeleton.meals.snack.approxCalories * 0.05),
        carbs: Math.round(daySkeleton.meals.snack.approxCalories * 0.15),
      };
    }

    const dailyDetail = await generateDailyDetails(
      daySkeleton.date,
      daySkeleton.meals,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dailyTargets as any,
      pool.ingredients
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertToSlot = (meal: any, skeletonMeal: any): MealSlot => ({
      ...meal,
      status: "planned",
      tags: skeletonMeal.mainIngredients,
    });

    const dayPlan: DayPlan = {
      isCheatDay: false,
      meals: {
        breakfast: convertToSlot(dailyDetail.meals.breakfast, daySkeleton.meals.breakfast),
        lunch: convertToSlot(dailyDetail.meals.lunch, daySkeleton.meals.lunch),
        dinner: convertToSlot(dailyDetail.meals.dinner, daySkeleton.meals.dinner),
      },
      totalNutrition: {
        calories: 0, protein: 0, fat: 0, carbs: 0 // あとで再計算
      }
    };

    // 間食がある場合は追加
    if (dailyDetail.meals.snack && daySkeleton.meals.snack) {
      dayPlan.meals.snack = convertToSlot(dailyDetail.meals.snack, daySkeleton.meals.snack);
    }

    return { 
      date: daySkeleton.date, 
      plan: recalculateDayNutrition(dayPlan) 
    };
  });

  const results = await Promise.all(dayPromises);
  
  const days: Record<string, DayPlan> = {};
  results.forEach(res => {
    days[res.date] = res.plan;
  });

  return {
    days,
    isValid: true, 
    invalidMealsCount: 0,
  };
}