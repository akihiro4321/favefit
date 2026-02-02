/**
 * FaveFit - Meal Plan Generation Workflow (Vercel AI SDK形式)
 * 
 * 食事プラン生成ワークフロー
 * MastraのcreateWorkflow/createStepを標準的な非同期関数チェーンに変換
 */

import { z } from "zod";
import { runAgentWithSchema } from "../utils/agent-helpers";
import {
  DEFAULT_PLAN_DURATION_DAYS,
  runPlanGenerator,
  type PlanGeneratorInput,
  type PlanGeneratorOutput,
} from "../agents/plan-generator";
import {
  SingleMealSchema,
} from "../types/common";
import { 
  PLAN_GENERATOR_INSTRUCTIONS,
  getPlanGenerationPrompt, 
  getBatchMealFixPrompt 
} from "../agents/prompts/plan-generator";
import { validatePlanNutrition, recalculateDayNutrition, MealValidationError } from "@/lib/tools/nutritionValidator";
import { DayPlan, MealSlot } from "@/lib/schema";
import { MealTargetNutrition, NutritionValues } from "@/lib/tools/mealNutritionCalculator";

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
 * 一括修正用の出力スキーマ
 */
const BatchFixOutputSchema = z.object({
  meals: z.array(
    z.object({
      key: z.string().describe("日付とmealTypeを結合したキー（例：2024-01-01_breakfast）"),
      recipe: SingleMealSchema,
    })
  ),
});

/**
 * フォールバック用の固定メニューを生成
 */
function getFallbackMeal(mealType: string, target: NutritionValues): MealSlot {
  const mealTypeJa = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" }[
    mealType as "breakfast" | "lunch" | "dinner"
  ];

  return {
    recipeId: `fallback-${mealType}-${Date.now()}`,
    title: `【栄養調整】鶏胸肉とブロッコリーのバランスセット (${mealTypeJa})`,
    status: "planned",
    nutrition: { ...target },
    tags: ["高タンパク", "調整用", "時短"],
    ingredients: [
      { name: "鶏胸肉", amount: "150g" },
      { name: "ブロッコリー", amount: "100g" },
      { name: "玄米", amount: "150g" },
      { name: "オリーブオイル", amount: "適量" },
      { name: "塩コショウ", amount: "少々" },
    ],
    steps: [
      "鶏胸肉とブロッコリーを一口大に切る",
      "耐熱容器に入れ、塩コショウとオリーブオイルを少量かける",
      "ふんわりラップをして電子レンジで加熱(600Wで約5分)",
      "玄米を添えて完成",
    ],
  };
}

/**
 * AI出力を内部形式に変換するヘルパー
 */
function convertToInternalFormat(
  generatedPlan: PlanGeneratorOutput
): Record<string, DayPlan> {
  const days: Record<string, DayPlan> = {};

  for (const [date, dayData] of Object.entries(generatedPlan.days)) {
    const convertMeal = (meal: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: { name: string; amount: string }[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    }): MealSlot => ({
      recipeId:
        meal.recipeId ||
        `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: meal.title,
      status: "planned",
      nutrition: {
        calories: Number(meal.nutrition.calories) || 0,
        protein: Number(meal.nutrition.protein) || 0,
        fat: Number(meal.nutrition.fat) || 0,
        carbs: Number(meal.nutrition.carbs) || 0,
      },
      tags: meal.tags || [],
      ingredients: meal.ingredients || [],
      steps: meal.steps || [],
    });

    const breakfast = convertMeal(dayData.meals.breakfast);
    const lunch = convertMeal(dayData.meals.lunch);
    const dinner = convertMeal(dayData.meals.dinner);

    days[date] = {
      isCheatDay: !!dayData.isCheatDay,
      meals: { breakfast, lunch, dinner },
      totalNutrition: {
        calories:
          breakfast.nutrition.calories +
          lunch.nutrition.calories +
          dinner.nutrition.calories,
        protein:
          breakfast.nutrition.protein +
          lunch.nutrition.protein +
          dinner.nutrition.protein,
        fat:
          breakfast.nutrition.fat + lunch.nutrition.fat + dinner.nutrition.fat,
        carbs:
          breakfast.nutrition.carbs +
          lunch.nutrition.carbs +
          dinner.nutrition.carbs,
      },
    };
  }

  return days;
}

/**
 * ステップ1: 初回のプラン生成
 */
async function generateInitialPlan(
  input: PlanGeneratorInput,
  feedbackText?: string,
  userId?: string
): Promise<PlanGeneratorOutput> {
  const prompt = getPlanGenerationPrompt({
    duration: DEFAULT_PLAN_DURATION_DAYS,
    user_info: JSON.stringify(input, null, 2),
    feedback_text: feedbackText || "",
  });

  return runPlanGenerator(prompt, userId);
}

/**
 * ステップ2: 内部形式への変換と栄養素バリデーション
 */
function validatePlan(
  generatedPlan: PlanGeneratorOutput,
  mealTargets: MealTargetNutrition
): {
  days: Record<string, DayPlan>;
  invalidMeals: MealValidationError[];
  isValid: boolean;
} {
  const days = convertToInternalFormat(generatedPlan);
  const validationResult = validatePlanNutrition(days, mealTargets);

  console.log(
    `[Workflow:validatePlan] Valid: ${validationResult.isValid}, Invalid meals: ${validationResult.invalidMeals.length}`
  );

  return {
    days,
    invalidMeals: validationResult.invalidMeals,
    isValid: validationResult.isValid,
  };
}

/**
 * ステップ3: 不合格の食事を一括で再生成
 */
async function fixInvalidMeals(
  days: Record<string, DayPlan>,
  invalidMeals: MealValidationError[],
  mealTargets: MealTargetNutrition,
  dislikedIngredients: string[],
  userId?: string
): Promise<{
  days: Record<string, DayPlan>;
  invalidMeals: MealValidationError[];
  isValid: boolean;
}> {
  if (invalidMeals.length === 0) {
    console.log("[Workflow:fixInvalidMeals] All meals valid, skipping fix step.");
    return { days, invalidMeals: [], isValid: true };
  }

  console.log(
    `[Workflow:fixInvalidMeals] Fixing ${invalidMeals.length} invalid meals in one batch...`
  );

  // 既存メニュー名を収集（重複回避用）
  const existingTitles = Object.values(days).flatMap((d) => [
    d.meals.breakfast.title,
    d.meals.lunch.title,
    d.meals.dinner.title,
  ]);

  // 不合格食事の情報を整形
  const mealTypeJaMap = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" } as const;
  const invalidMealInfos = invalidMeals.map((m) => ({
    date: m.date,
    mealType: m.mealType,
    mealTypeJa: mealTypeJaMap[m.mealType],
    target: m.target,
  }));

  // 一括修正プロンプトを生成
  const prompt = getBatchMealFixPrompt({
    invalidMeals: invalidMealInfos,
    dislikedIngredients,
    existingTitles,
  });

  try {
    const object = await runAgentWithSchema(
      PLAN_GENERATOR_INSTRUCTIONS,
      prompt,
      BatchFixOutputSchema,
      "flash",
      "fix-invalid-meals",
      userId
    );

    // 修正結果をマージ
    const updatedDays = { ...days };

    for (const fixedMeal of object.meals) {
      const [date, mealType] = fixedMeal.key.split("_");

      if (!date || !mealType || !updatedDays[date]) {
        console.warn(`[Workflow:fixInvalidMeals] Invalid key: ${fixedMeal.key}`);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const target = (mealTargets as any)[mealType];
      if (!target) continue;

      // カロリー差が15%以内かチェック
      const diff =
        Math.abs(fixedMeal.recipe.nutrition.calories - target.calories) /
        target.calories;

      if (diff <= 0.15) {
        const mealSlot: MealSlot = {
          recipeId: fixedMeal.recipe.recipeId,
          title: fixedMeal.recipe.title,
          status: "planned",
          nutrition: fixedMeal.recipe.nutrition,
          tags: fixedMeal.recipe.tags,
          ingredients: fixedMeal.recipe.ingredients || [],
          steps: fixedMeal.recipe.steps || [],
        };
        updatedDays[date].meals[mealType as "breakfast" | "lunch" | "dinner"] =
          mealSlot;
        updatedDays[date] = recalculateDayNutrition(updatedDays[date]);
      }
    }

    // 再バリデーション
    const validationResult = validatePlanNutrition(updatedDays, mealTargets);
    console.log(
      `[Workflow:fixInvalidMeals] After fix - Valid: ${validationResult.isValid}, Remaining invalid: ${validationResult.invalidMeals.length}`
    );

    return {
      days: updatedDays,
      invalidMeals: validationResult.invalidMeals,
      isValid: validationResult.isValid,
    };
  } catch (e) {
    console.error("[Workflow:fixInvalidMeals] Error during batch fix:", e);
    return { days, invalidMeals, isValid: false };
  }
}

/**
 * ステップ4: 最終的なフォールバックを適用
 */
function applyFinalFallback(
  days: Record<string, DayPlan>,
  invalidMeals: MealValidationError[],
  mealTargets: MealTargetNutrition
): Record<string, DayPlan> {
  if (invalidMeals.length === 0) {
    return days;
  }

  console.log(
    `[Workflow:applyFinalFallback] Applying fallback for ${invalidMeals.length} remaining invalid meals.`
  );
  const finalDays = { ...days };

  for (const { date, mealType } of invalidMeals) {
    const target = mealTargets[mealType];
    finalDays[date].meals[mealType] = getFallbackMeal(mealType, target);
    finalDays[date] = recalculateDayNutrition(finalDays[date]);
  }

  return finalDays;
}

/**
 * 食事プラン生成ワークフロー (メイン)
 *
 * シンプルな4ステップフロー:
 * 1. generateInitialPlan - 初回プラン生成
 * 2. validatePlan - バリデーション
 * 3. fixInvalidMeals - 不合格分を一括再生成（1回のLLM呼び出し）
 * 4. applyFinalFallback - それでもダメならフォールバック
 */
export async function generateMealPlan(
  workflowInput: MealPlanWorkflowInput
): Promise<MealPlanWorkflowResult> {
  const { input, feedbackText, mealTargets, dislikedIngredients, userId } = workflowInput;

  // ステップ1: 初回プラン生成
  console.log("[Workflow] Step 1: Generating initial plan...");
  const generatedPlan = await generateInitialPlan(input, feedbackText, userId);

  // ステップ2: バリデーション
  console.log("[Workflow] Step 2: Validating plan...");
  const validationResult = validatePlan(generatedPlan, mealTargets);

  // ステップ3: 不合格分を一括で再生成
  console.log("[Workflow] Step 3: Fixing invalid meals...");
  const fixResult = await fixInvalidMeals(
    validationResult.days,
    validationResult.invalidMeals,
    mealTargets,
    dislikedIngredients,
    userId
  );

  // ステップ4: 最終フォールバック
  console.log("[Workflow] Step 4: Applying final fallback if needed...");
  const finalDays = applyFinalFallback(
    fixResult.days,
    fixResult.invalidMeals,
    mealTargets
  );

  return {
    days: finalDays,
    isValid: fixResult.isValid || fixResult.invalidMeals.length === 0,
    invalidMealsCount: fixResult.invalidMeals.length,
  };
}
