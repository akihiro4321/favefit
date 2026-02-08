/**
 * FaveFit - 栄養素バリデーション
 * 生成されたプランの栄養素が目標値の許容誤差内かを検証
 */

import { DayPlan, MealSlot } from "@/lib/schema";
import { NutritionValues, MealTargetNutrition } from "./mealNutritionCalculator";

/**
 * バリデーション結果の詳細
 */
export interface MealValidationError {
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  actual: NutritionValues;
  target: NutritionValues;
  errors: string[];
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  invalidMeals: MealValidationError[];
  summary: {
    totalMeals: number;
    validMeals: number;
    invalidMeals: number;
  };
}

/**
 * デフォルトの許容誤差（%）
 */
const DEFAULT_TOLERANCE_PERCENT = 15;

/**
 * 単一の栄養素値をバリデーション
 *
 * @param actual - 実際の値
 * @param target - 目標値
 * @param tolerancePercent - 許容誤差（%）
 * @param nutrientName - 栄養素名（エラーメッセージ用）
 * @returns エラーメッセージ（許容範囲内ならnull）
 */
function validateNutrient(
  actual: number,
  target: number,
  tolerancePercent: number,
  nutrientName: string
): string | null {
  if (target === 0) {
    return actual === 0 ? null : `${nutrientName}: 目標0に対し${actual}`;
  }

  const diff = Math.abs(actual - target);
  const diffPercent = (diff / target) * 100;

  if (diffPercent > tolerancePercent) {
    const direction = actual > target ? "超過" : "不足";
    return `${nutrientName}: ${direction}${diffPercent.toFixed(1)}% (実際${actual} vs 目標${target})`;
  }

  return null;
}

/**
 * 単一の食事をバリデーション
 *
 * @param meal - 食事データ
 * @param target - 目標栄養素
 * @param tolerancePercent - 許容誤差（%）
 * @returns エラーメッセージの配列（空なら問題なし）
 */
function validateMealNutrition(
  meal: MealSlot,
  target: NutritionValues,
  tolerancePercent: number
): string[] {
  const errors: string[] = [];

  const calorieError = validateNutrient(
    meal.nutrition.calories,
    target.calories,
    tolerancePercent,
    "カロリー"
  );
  if (calorieError) errors.push(calorieError);

  const proteinError = validateNutrient(
    meal.nutrition.protein,
    target.protein,
    tolerancePercent,
    "タンパク質"
  );
  if (proteinError) errors.push(proteinError);

  const fatError = validateNutrient(
    meal.nutrition.fat,
    target.fat,
    tolerancePercent,
    "脂質"
  );
  if (fatError) errors.push(fatError);

  const carbsError = validateNutrient(
    meal.nutrition.carbs,
    target.carbs,
    tolerancePercent,
    "炭水化物"
  );
  if (carbsError) errors.push(carbsError);

  return errors;
}

/**
 * プラン全体の栄養素をバリデーション
 *
 * @param days - プランの日付データ
 * @param mealTargets - 各食事の目標栄養素
 * @param tolerancePercent - 許容誤差（%）、デフォルト15%
 * @returns バリデーション結果
 */
export function validatePlanNutrition(
  days: Record<string, DayPlan>,
  mealTargets: MealTargetNutrition,
  tolerancePercent: number = DEFAULT_TOLERANCE_PERCENT,
  fixedMeals?: {
    breakfast?: { title: string };
    lunch?: { title: string };
    dinner?: { title: string };
  }
): ValidationResult {
  const invalidMeals: MealValidationError[] = [];
  let totalMeals = 0;

  for (const [date, dayPlan] of Object.entries(days)) {
    // チートデイはスキップ
    if (dayPlan.isCheatDay) {
      continue;
    }

    const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = [
      "breakfast",
      "lunch",
      "dinner",
    ];

    for (const mealType of mealTypes) {
      totalMeals++;
      const meal = dayPlan.meals[mealType];
      const target = mealTargets[mealType];

      // 固定メニューが設定されている場合
      const fixedMeal = fixedMeals?.[mealType as keyof typeof fixedMeals];

      // 固定メニュー判定:
      // Auditorによって正規化されたタイトルと完全一致するか、あるいは部分一致する場合
      // 固定メニューはユーザーの選択を優先するため、栄養素バリデーションをスキップする
      if (fixedMeal?.title && (meal.title === fixedMeal.title || meal.title.includes(fixedMeal.title))) {
        continue;
      }

      const errors = validateMealNutrition(meal, target, tolerancePercent);

      if (errors.length > 0) {
        invalidMeals.push({
          date,
          mealType,
          actual: meal.nutrition,
          target,
          errors,
        });
      }
    }
  }

  return {
    isValid: invalidMeals.length === 0,
    invalidMeals,
    summary: {
      totalMeals,
      validMeals: totalMeals - invalidMeals.length,
      invalidMeals: invalidMeals.length,
    },
  };
}

/**
 * 1日の合計栄養素を再計算
 *
 * @param dayPlan - 日のプラン
 * @returns 更新されたDayPlan
 */
export function recalculateDayNutrition(dayPlan: DayPlan): DayPlan {
  const { breakfast, lunch, dinner, snack } = dayPlan.meals;

  const totalNutrition = {
    calories:
      breakfast.nutrition.calories +
      lunch.nutrition.calories +
      dinner.nutrition.calories +
      (snack?.nutrition.calories || 0),
    protein:
      breakfast.nutrition.protein +
      lunch.nutrition.protein +
      dinner.nutrition.protein +
      (snack?.nutrition.protein || 0),
    fat:
      breakfast.nutrition.fat + 
      lunch.nutrition.fat + 
      dinner.nutrition.fat +
      (snack?.nutrition.fat || 0),
    carbs:
      breakfast.nutrition.carbs +
      lunch.nutrition.carbs +
      dinner.nutrition.carbs +
      (snack?.nutrition.carbs || 0),
  };

  return {
    ...dayPlan,
    totalNutrition,
  };
}

/**
 * バリデーション結果をログ出力
 *
 * @param result - バリデーション結果
 */
export function logValidationResult(result: ValidationResult): void {
  console.log(
    `[Nutrition Validation] ${result.summary.validMeals}/${result.summary.totalMeals} meals valid`
  );

  if (!result.isValid) {
    for (const error of result.invalidMeals) {
      console.warn(
        `[Nutrition Validation] Invalid meal: ${error.date} ${error.mealType}`
      );
      for (const msg of error.errors) {
        console.warn(`  - ${msg}`);
      }
    }
  }
}
