import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { 
  PlanGeneratorInputSchema, 
  PlanGeneratorOutputSchema, 
  DEFAULT_PLAN_DURATION_DAYS,
  SingleMealSchema
} from "../agents/plan-generator";
import { getPlanGenerationPrompt, getBatchMealFixPrompt } from "../prompts/plan-generator";
import { validatePlanNutrition, recalculateDayNutrition } from "@/lib/tools/nutritionValidator";
import { DayPlan, MealSlot } from "@/lib/schema";
import { MealTargetNutrition } from "@/lib/tools/mealNutritionCalculator";
import { MealValidationError } from "@/lib/tools/nutritionValidator";
import { NutritionValues } from "@/lib/tools/mealNutritionCalculator";

/**
 * フォールバック用の固定メニューを生成
 */
function getFallbackMeal(mealType: string, target: NutritionValues): MealSlot {
  const mealTypeJa = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" }[mealType as "breakfast" | "lunch" | "dinner"];
  
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
      { name: "塩コショウ", amount: "少々" }
    ],
    steps: [
      "鶏胸肉とブロッコリーを一口大に切る",
      "耐熱容器に入れ、塩コショウとオリーブオイルを少量かける",
      "ふんわりラップをして電子レンジで加熱(600Wで約5分)",
      "玄米を添えて完成"
    ]
  };
}

/**
 * AI出力を内部形式に変換するヘルパー
 */
function convertToInternalFormat(generatedPlan: z.infer<typeof PlanGeneratorOutputSchema>): Record<string, DayPlan> {
  const days: Record<string, DayPlan> = {};
  
  for (const day of generatedPlan.days) {
    const convertMeal = (meal: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: { name: string; amount: string }[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    }): MealSlot => ({
      recipeId: meal.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

    const breakfast = convertMeal(day.breakfast);
    const lunch = convertMeal(day.lunch);
    const dinner = convertMeal(day.dinner);

    days[day.date] = {
      isCheatDay: !!day.isCheatDay,
      meals: { breakfast, lunch, dinner },
      totalNutrition: {
        calories: (breakfast.nutrition.calories + lunch.nutrition.calories + dinner.nutrition.calories),
        protein: (breakfast.nutrition.protein + lunch.nutrition.protein + dinner.nutrition.protein),
        fat: (breakfast.nutrition.fat + lunch.nutrition.fat + dinner.nutrition.fat),
        carbs: (breakfast.nutrition.carbs + lunch.nutrition.carbs + dinner.nutrition.carbs),
      },
    };
  }
  
  return days;
}

// 一括修正用の出力スキーマ
const BatchFixOutputSchema = z.object({
  meals: z.array(z.object({
    key: z.string().describe("日付とmealTypeを結合したキー（例：2024-01-01_breakfast）"),
    recipe: SingleMealSchema,
  })),
});

/**
 * ステップ1: 初回のプラン生成
 */
const generateInitialPlanStep = createStep({
  id: "generateInitialPlan",
  inputSchema: z.object({
    input: PlanGeneratorInputSchema,
    feedbackText: z.string().optional(),
  }),
  outputSchema: PlanGeneratorOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("planGenerator");
    
    const userMessage = getPlanGenerationPrompt({
      duration: DEFAULT_PLAN_DURATION_DAYS,
      user_info: JSON.stringify(inputData.input, null, 2),
      feedback_text: inputData.feedbackText || "",
    });

    const result = await agent.generate(userMessage, { 
      structuredOutput: { schema: PlanGeneratorOutputSchema, jsonPromptInjection: true } 
    });

    if (!result.object) {
      throw new Error("AIからの構造化出力の取得に失敗しました。");
    }

    return result.object;
  },
});

/**
 * ステップ2: 内部形式への変換と栄養素バリデーション
 */
const validatePlanStep = createStep({
  id: "validatePlan",
  inputSchema: z.object({
    generatedPlan: PlanGeneratorOutputSchema,
    mealTargets: z.custom<MealTargetNutrition>(),
  }),
  outputSchema: z.object({
    days: z.record(z.any()), // Record<string, DayPlan>
    invalidMeals: z.array(z.any()),
    isValid: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { generatedPlan, mealTargets } = inputData;

    // 内部形式に変換
    const days = convertToInternalFormat(generatedPlan);

    // バリデーション実行
    const validationResult = validatePlanNutrition(days, mealTargets);
    
    console.log(`[Workflow:validatePlan] Valid: ${validationResult.isValid}, Invalid meals: ${validationResult.invalidMeals.length}`);
    
    return {
      days,
      invalidMeals: validationResult.invalidMeals,
      isValid: validationResult.isValid,
    };
  },
});

/**
 * ステップ3: 不合格の食事を一括で再生成
 */
const fixInvalidMealsStep = createStep({
  id: "fixInvalidMeals",
  inputSchema: z.object({
    days: z.record(z.any()),
    invalidMeals: z.array(z.any()),
    isValid: z.boolean(),
    mealTargets: z.custom<MealTargetNutrition>(),
    dislikedIngredients: z.array(z.string()),
  }),
  outputSchema: z.object({
    days: z.record(z.any()),
    invalidMeals: z.array(z.any()),
    isValid: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { days, invalidMeals, isValid, mealTargets, dislikedIngredients } = inputData as {
      days: Record<string, DayPlan>;
      invalidMeals: MealValidationError[];
      isValid: boolean;
      mealTargets: MealTargetNutrition;
      dislikedIngredients: string[];
    };

    // バリデーション合格ならそのまま返す
    if (isValid || invalidMeals.length === 0) {
      console.log("[Workflow:fixInvalidMeals] All meals valid, skipping fix step.");
      return { days, invalidMeals: [], isValid: true };
    }

    console.log(`[Workflow:fixInvalidMeals] Fixing ${invalidMeals.length} invalid meals in one batch...`);

    const agent = mastra.getAgent("planGenerator");
    
    // 既存メニュー名を収集（重複回避用）
    const existingTitles = Object.values(days).flatMap((d) => [
      d.meals.breakfast.title, d.meals.lunch.title, d.meals.dinner.title,
    ]);

    // 不合格食事の情報を整形
    const mealTypeJaMap = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" } as const;
    const invalidMealInfos = invalidMeals.map(m => ({
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
      const result = await agent.generate(prompt, {
        structuredOutput: { schema: BatchFixOutputSchema, jsonPromptInjection: true },
      });

      if (!result.object) {
        console.error("[Workflow:fixInvalidMeals] Failed to get structured output from AI.");
        return { days, invalidMeals, isValid: false };
      }

      // 修正結果をマージ
      const updatedDays = { ...days };
      
      for (const fixedMeal of result.object.meals) {
        const [date, mealType] = fixedMeal.key.split("_");
        
        if (!date || !mealType || !updatedDays[date]) {
          console.warn(`[Workflow:fixInvalidMeals] Invalid key: ${fixedMeal.key}`);
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const target = (mealTargets as any)[mealType];
        if (!target) continue;

        // カロリー差が15%以内かチェック
        const diff = Math.abs(fixedMeal.recipe.nutrition.calories - target.calories) / target.calories;
        
        if (diff <= 0.15) {
          const mealSlot: MealSlot = {
            recipeId: fixedMeal.recipe.recipeId,
            title: fixedMeal.recipe.title,
            status: "planned",
            nutrition: fixedMeal.recipe.nutrition,
            tags: fixedMeal.recipe.tags,
            ingredients: fixedMeal.recipe.ingredients, // すでに構造化されている
            steps: fixedMeal.recipe.steps,
          };
          updatedDays[date].meals[mealType as "breakfast" | "lunch" | "dinner"] = mealSlot;
          updatedDays[date] = recalculateDayNutrition(updatedDays[date]);
        }
      }

      // 再バリデーション
      const validationResult = validatePlanNutrition(updatedDays, mealTargets);
      console.log(`[Workflow:fixInvalidMeals] After fix - Valid: ${validationResult.isValid}, Remaining invalid: ${validationResult.invalidMeals.length}`);
      
      return {
        days: updatedDays,
        invalidMeals: validationResult.invalidMeals,
        isValid: validationResult.isValid,
      };
    } catch (e) {
      console.error("[Workflow:fixInvalidMeals] Error during batch fix:", e);
      return { days, invalidMeals, isValid: false };
    }
  },
});

/**
 * ステップ4: 最終的なフォールバックを適用
 * 2回目の修正後も不合格な食事が残っている場合に固定メニューに差し替える
 */
const applyFinalFallbackStep = createStep({
  id: "applyFinalFallback",
  inputSchema: z.object({
    days: z.record(z.any()),
    invalidMeals: z.array(z.any()),
    isValid: z.boolean(),
    mealTargets: z.custom<MealTargetNutrition>(),
  }),
  outputSchema: z.record(z.any()), // Record<string, DayPlan>
  execute: async ({ inputData }) => {
    const { days, invalidMeals, mealTargets, isValid } = inputData as {
      days: Record<string, DayPlan>;
      invalidMeals: MealValidationError[];
      mealTargets: MealTargetNutrition;
      isValid: boolean;
    };

    if (isValid || invalidMeals.length === 0) {
      return days;
    }

    console.log(`[Workflow:applyFinalFallback] Applying fallback for ${invalidMeals.length} remaining invalid meals.`);
    const finalDays = { ...days };

    for (const { date, mealType } of invalidMeals) {
      const target = mealTargets[mealType];
      finalDays[date].meals[mealType] = getFallbackMeal(mealType, target);
      finalDays[date] = recalculateDayNutrition(finalDays[date]);
    }

    return finalDays;
  },
});

/**
 * 7日間食事プラン生成ワークフロー (メイン)
 * 
 * シンプルな4ステップフロー:
 * 1. generateInitialPlan - 初回プラン生成
 * 2. validatePlan - バリデーション
 * 3. fixInvalidMeals - 不合格分を一括再生成（1回のLLM呼び出し）
 * 4. applyFinalFallback - それでもダメならフォールバック
 */
export const mealPlanGenerationWorkflow = createWorkflow({
  id: "meal-plan-generation",
  inputSchema: z.object({
    input: PlanGeneratorInputSchema,
    feedbackText: z.string().optional(),
    mealTargets: z.custom<MealTargetNutrition>(),
    dislikedIngredients: z.array(z.string()),
  }),
  outputSchema: z.record(z.any()), // Record<string, DayPlan>
})
  // ステップ1: 初回プラン生成
  .then(generateInitialPlanStep)
  // マップ: validatePlan用に入力を整形
  .map(async ({ inputData, getInitData }) => {
    const initData = getInitData() as { mealTargets: MealTargetNutrition };
    return {
      generatedPlan: inputData,
      mealTargets: initData.mealTargets,
    };
  })
  // ステップ2: バリデーション
  .then(validatePlanStep)
  // マップ: fixInvalidMeals用に入力を整形
  .map(async ({ inputData, getInitData }) => {
    const initData = getInitData() as { 
      mealTargets: MealTargetNutrition; 
      dislikedIngredients: string[]; 
    };
    return {
      ...inputData,
      mealTargets: initData.mealTargets,
      dislikedIngredients: initData.dislikedIngredients,
    };
  })
  // ステップ3: 不合格分を一括で再生成
  .then(fixInvalidMealsStep)
  // マップ: applyFinalFallback用に入力を整形
  .map(async ({ inputData, getInitData }) => {
    const initData = getInitData() as { mealTargets: MealTargetNutrition };
    return {
      ...inputData,
      mealTargets: initData.mealTargets,
    };
  })
  // ステップ4: 最終フォールバック
  .then(applyFinalFallbackStep)
  .commit();
