/**
 * FaveFit - Plan Generator Agent (Two-Stage)
 */

import { PlanGeneratorInput } from "../types/plan-input";
import {
  MealTargetNutrition,
  NutritionValues,
} from "@/lib/tools/mealNutritionCalculator";
import { DayPlan, MealSlot } from "@/lib/schema";
import { generatePlanSkeleton } from "../functions/plan-skeleton-generator";
import { generateChunkDetails } from "../functions/chunk-detail-generator";
import { recalculateDayNutrition } from "@/lib/tools/nutritionValidator";

/**
 * 栄養目標をスケルトンのカロリーに合わせて比例調整するヘルパー
 */
function adjustTargetsToSkeleton(
  skeletonMeal: { approxCalories: number },
  originalTarget: NutritionValues
): NutritionValues {
  const ratio =
    originalTarget.calories > 0
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
 * 2段階生成フローを実行するメインエージェント
 */
export async function runPlanGenerator(
  input: PlanGeneratorInput,
  mealTargets: MealTargetNutrition,
  duration: number = 7
): Promise<{
  days: Record<string, DayPlan>;
  isValid: boolean;
  invalidMealsCount: number;
}> {
  // Phase 1: スケルトン生成
  console.log(
    `[PlanGenerator] Phase 1: Generating weekly skeleton for ${duration} days...`
  );
  const skeleton = await generatePlanSkeleton(input, duration);

  // Phase 2: 詳細生成（チャンク単位並列実行）
  console.log(
    "[PlanGenerator] Phase 2: Generating chunk details in parallel..."
  );

  const chunkPromises = skeleton.ingredientPools.map(async (pool) => {
    const [start, end] = pool.period.split(" to ");
    // このプールに属する日を抽出
    const targetDays = skeleton.days.filter(
      (d) => d.date >= start && d.date <= end
    );

    if (targetDays.length === 0) return [];

    console.log(
      `[PlanGenerator] Processing chunk: ${pool.period} (${targetDays.length} days)`
    );

    const daysInput = targetDays.map((daySkeleton) => {
      const dailyTargets: Record<string, NutritionValues> = {
        breakfast: adjustTargetsToSkeleton(
          daySkeleton.meals.breakfast,
          mealTargets.breakfast
        ),
        lunch: adjustTargetsToSkeleton(
          daySkeleton.meals.lunch,
          mealTargets.lunch
        ),
        dinner: adjustTargetsToSkeleton(
          daySkeleton.meals.dinner,
          mealTargets.dinner
        ),
      };

      if (daySkeleton.meals.snack) {
        dailyTargets.snack = {
          calories: daySkeleton.meals.snack.approxCalories,
          protein: Math.round(daySkeleton.meals.snack.approxCalories * 0.1),
          fat: Math.round(daySkeleton.meals.snack.approxCalories * 0.05),
          carbs: Math.round(daySkeleton.meals.snack.approxCalories * 0.15),
        };
      }

      return {
        date: daySkeleton.date,
        meals: daySkeleton.meals,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        targets: dailyTargets as any,
      };
    });

    const chunkResult = await generateChunkDetails({
      pool,
      days: daysInput,
    });

    // 内部形式への変換
    return chunkResult.days.map((dailyDetail, idx) => {
      const daySkeleton = targetDays[idx]; // 順序は保証されている前提

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convertToSlot = (meal: any, skeletonMeal: any): MealSlot => ({
        ...meal,
        recipeId: `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        status: "planned",
        tags: skeletonMeal.mainIngredients,
      });

      const dayPlan: DayPlan = {
        isCheatDay: false,
        meals: {
          breakfast: convertToSlot(
            dailyDetail.meals.breakfast,
            daySkeleton.meals.breakfast
          ),
          lunch: convertToSlot(
            dailyDetail.meals.lunch,
            daySkeleton.meals.lunch
          ),
          dinner: convertToSlot(
            dailyDetail.meals.dinner,
            daySkeleton.meals.dinner
          ),
        },
        totalNutrition: { calories: 0, protein: 0, fat: 0, carbs: 0 },
      };

      if (dailyDetail.meals.snack && daySkeleton.meals.snack) {
        dayPlan.meals.snack = convertToSlot(
          dailyDetail.meals.snack,
          daySkeleton.meals.snack
        );
      }

      return {
        date: daySkeleton.date,
        plan: recalculateDayNutrition(dayPlan),
      };
    });
  });

  const chunkResults = await Promise.all(chunkPromises);
  const flatResults = chunkResults.flat();

  const days: Record<string, DayPlan> = {};
  flatResults.forEach((res) => {
    days[res.date] = res.plan;
  });

  return {
    days,
    isValid: true,
    invalidMealsCount: 0,
  };
}
