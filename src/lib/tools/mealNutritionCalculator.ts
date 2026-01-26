/**
 * FaveFit - 各食事の目標栄養素計算
 * 1日の目標栄養素を朝食20%、昼食40%、夕食40%に配分
 */

/**
 * 栄養素の値
 */
export interface NutritionValues {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * 各食事の目標栄養素
 */
export interface MealTargetNutrition {
  breakfast: NutritionValues;
  lunch: NutritionValues;
  dinner: NutritionValues;
}

/**
 * 食事配分比率（固定）
 */
const MEAL_RATIOS = {
  breakfast: 0.2, // 20%
  lunch: 0.4, // 40%
  dinner: 0.4, // 40%
} as const;

/**
 * 1日の目標栄養素から各食事の目標栄養素を計算
 *
 * @param dailyTarget - 1日の目標栄養素
 * @returns 各食事の目標栄養素
 */
export function calculateMealTargets(// TODO: ユーザーの食生活に合わせて配分比率を調整できるようにする
  dailyTarget: NutritionValues
): MealTargetNutrition {
  return {
    breakfast: {
      calories: Math.round(dailyTarget.calories * MEAL_RATIOS.breakfast),
      protein: Math.round(dailyTarget.protein * MEAL_RATIOS.breakfast),
      fat: Math.round(dailyTarget.fat * MEAL_RATIOS.breakfast),
      carbs: Math.round(dailyTarget.carbs * MEAL_RATIOS.breakfast),
    },
    lunch: {
      calories: Math.round(dailyTarget.calories * MEAL_RATIOS.lunch),
      protein: Math.round(dailyTarget.protein * MEAL_RATIOS.lunch),
      fat: Math.round(dailyTarget.fat * MEAL_RATIOS.lunch),
      carbs: Math.round(dailyTarget.carbs * MEAL_RATIOS.lunch),
    },
    dinner: {
      calories: Math.round(dailyTarget.calories * MEAL_RATIOS.dinner),
      protein: Math.round(dailyTarget.protein * MEAL_RATIOS.dinner),
      fat: Math.round(dailyTarget.fat * MEAL_RATIOS.dinner),
      carbs: Math.round(dailyTarget.carbs * MEAL_RATIOS.dinner),
    },
  };
}

/**
 * 目標栄養素を人間が読みやすい形式でフォーマット
 *
 * @param targets - 各食事の目標栄養素
 * @returns フォーマットされた文字列
 */
export function formatMealTargets(targets: MealTargetNutrition): string {
  const format = (name: string, n: NutritionValues) =>
    `- ${name}: ${n.calories}kcal, P${n.protein}g, F${n.fat}g, C${n.carbs}g`;

  return [
    format("朝食", targets.breakfast),
    format("昼食", targets.lunch),
    format("夕食", targets.dinner),
  ].join("\n");
}
