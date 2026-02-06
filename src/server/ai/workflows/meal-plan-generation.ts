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
  getBatchMealFixPrompt 
} from "../agents/prompts/plan-generator";
import { validatePlanNutrition, recalculateDayNutrition, MealValidationError } from "@/lib/tools/nutritionValidator";
import { DayPlan, MealSlot, UserProfile, UserNutrition } from "@/lib/schema";
import { MealTargetNutrition, NutritionValues } from "@/lib/tools/mealNutritionCalculator";
import { runAuditor } from "../agents/auditor";
import { getFillPlanPrompt } from "../agents/prompts/plan-generator";
import { dietBaselineService } from "../../services/diet-baseline-service";

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

  for (const dayData of generatedPlan.days) {
    const date = dayData.date;
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
 * ステップ2: 内部形式への変換と栄養素バリデーション
 */
function validatePlan(
  generatedPlan: PlanGeneratorOutput,
  mealTargets: MealTargetNutrition,
  fixedMeals?: PlanGeneratorInput["fixedMeals"]
): {
  days: Record<string, DayPlan>;
  invalidMeals: MealValidationError[];
  isValid: boolean;
} {
  const days = convertToInternalFormat(generatedPlan);
  const validationResult = validatePlanNutrition(days, mealTargets, undefined, fixedMeals);

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
  workflowInput: MealPlanWorkflowInput,
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
    fixedMeals: workflowInput.input.fixedMeals,
    mealConstraints: workflowInput.input.mealConstraints,
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

      if (mealType !== "breakfast" && mealType !== "lunch" && mealType !== "dinner") continue;
      const target = mealTargets[mealType];

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
 * 処理のステップ: Anchor & Fill
 */
async function runAnchorAndFillProcess(
  input: PlanGeneratorInput,
  mealTargets: MealTargetNutrition,
  feedbackText?: string,
  userId?: string
): Promise<PlanGeneratorOutput> {
  const duration = DEFAULT_PLAN_DURATION_DAYS;
  
  // 0. 適応型プランニング指示の生成 (現状の食生活分析)
  const totalTargetCalories = mealTargets.breakfast.calories + mealTargets.lunch.calories + mealTargets.dinner.calories;
  const adaptiveDirective = dietBaselineService.createAdaptiveDirective(
    {
      lifestyle: { currentDiet: input.currentDiet },
      physical: { goal: (input as unknown as { goal?: "lose" | "maintain" | "gain" }).goal || "maintain" }
    } as unknown as UserProfile,
    { dailyCalories: totalTargetCalories } as unknown as UserNutrition
  );

  console.log("[Workflow:Anchor&Fill] Adaptive Directive created:", JSON.stringify(adaptiveDirective.instructions));

  // 1. Auditorの実行 (固定・こだわり枠の栄養価解決)
  console.log("[Workflow:Anchor&Fill] 1. Running Auditor...");
  
  // input.mealSettingsが存在しない場合（後方互換性）は、空のオブジェクトとして扱う
  const mealSettings = input.mealSettings || {
    breakfast: { mode: "auto", text: "" },
    lunch: { mode: "auto", text: "" },
    dinner: { mode: "auto", text: "" },
  };

  // 1日の総目標
  const dailyTarget = {
    calories: mealTargets.breakfast.calories + mealTargets.lunch.calories + mealTargets.dinner.calories,
    protein: mealTargets.breakfast.protein + mealTargets.lunch.protein + mealTargets.dinner.protein,
    fat: mealTargets.breakfast.fat + mealTargets.lunch.fat + mealTargets.dinner.fat,
    carbs: mealTargets.breakfast.carbs + mealTargets.lunch.carbs + mealTargets.dinner.carbs,
  };

  const auditorResult = await runAuditor(mealSettings, dailyTarget);
  console.log(`[Workflow:Anchor&Fill] Auditor resolved ${auditorResult.anchors.length} anchors.`);

  // 2. 栄養予算（Remaining Budget）の計算
  // アンカーは毎日繰り返される前提で計算（MVP仕様）
  const anchorNutritionSum = auditorResult.anchors.reduce(
    (acc, anchor) => ({
      calories: acc.calories + anchor.estimatedNutrition.calories,
      protein: acc.protein + anchor.estimatedNutrition.protein,
      fat: acc.fat + anchor.estimatedNutrition.fat,
      carbs: acc.carbs + anchor.estimatedNutrition.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const remainingBudget = {
    calories: Math.max(0, dailyTarget.calories - anchorNutritionSum.calories),
    protein: Math.max(0, dailyTarget.protein - anchorNutritionSum.protein),
    fat: Math.max(0, dailyTarget.fat - anchorNutritionSum.fat),
    carbs: Math.max(0, dailyTarget.carbs - anchorNutritionSum.carbs),
  };

  const remainingBudgetSummary = `
- カロリー: ${remainingBudget.calories}kcal
- タンパク質: ${remainingBudget.protein}g
- 脂質: ${remainingBudget.fat}g
- 炭水化物: ${remainingBudget.carbs}g
`;

  // 3. Fill Planner用プロンプトの作成
  // アンカー情報の整形
  const anchorsText = auditorResult.anchors.map(a => 
    `- ${a.mealType}: ${a.resolvedTitle} (約${a.estimatedNutrition.calories}kcal)`
  ).join("\n") || "なし";

  const user_info = JSON.stringify({
    ...input,
    adaptiveDirective,
    // AIには解決済みの固定枠として渡す
    fixedMeals: auditorResult.anchors.reduce((acc, anchor) => ({
      ...acc,
      [anchor.mealType]: {
        title: anchor.resolvedTitle,
        nutrition: anchor.estimatedNutrition,
        tags: ["固定/こだわり"]
      }
    }), {})
  }, null, 2);

  const prompt = getFillPlanPrompt({
    duration,
    user_info,
    anchors: anchorsText,
    remaining_budget_summary: remainingBudgetSummary,
    feedback_text: feedbackText || "",
  });

  // 4. Fill Planner実行 (残りの枠を埋める)
  console.log("[Workflow:Anchor&Fill] 2. Running Fill Planner...");
  const generatedPlan = await runPlanGenerator(prompt, userId);

  return generatedPlan;
}

/**
 * 食事プラン生成ワークフロー (メイン)
 *
 * Anchor & Fill 戦略を用いた新しいフロー:
 * 1. runAnchorAndFillProcess - Auditorによる解決とFill Plannerによる生成
 * 2. validatePlan - バリデーション
 * 3. fixInvalidMeals - 不合格分を一括再生成
 * 4. applyFinalFallback - フォールバック
 */
export async function generateMealPlan(
  workflowInput: MealPlanWorkflowInput
): Promise<MealPlanWorkflowResult> {
  const { input, feedbackText, mealTargets, dislikedIngredients, userId } = workflowInput;

  // ステップ1: Anchor & Fill プロセス
  console.log("[Workflow] Step 1: Starting Anchor & Fill Process...");
  const generatedPlan = await runAnchorAndFillProcess(input, mealTargets, feedbackText, userId);

  // ステップ2: バリデーション
  console.log("[Workflow] Step 2: Validating plan...");
  const validationResult = validatePlan(generatedPlan, mealTargets, input.fixedMeals);

  // ステップ3: 不合格分を一括で再生成
  console.log("[Workflow] Step 3: Fixing invalid meals...");
  const fixResult = await fixInvalidMeals(
    validationResult.days,
    validationResult.invalidMeals,
    mealTargets,
    dislikedIngredients,
    workflowInput,
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