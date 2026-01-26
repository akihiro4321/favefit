import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { 
  PlanGeneratorInputSchema, 
  PlanGeneratorOutputSchema, 
  DEFAULT_PLAN_DURATION_DAYS,
  SingleMealSchema
} from "../agents/plan-generator";
import { PromptService } from "@/lib/services/prompt-service";
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
      "鶏胸肉 (150g)",
      "ブロッコリー (100g)",
      "玄米 (150g)",
      "オリーブオイル",
      "塩コショウ"
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
    
    const userMessage = await PromptService.getInstance().getCompiledPrompt(
      "plan_generate_prompt/with_specific_days",
      {
        duration: DEFAULT_PLAN_DURATION_DAYS,
        user_info: JSON.stringify(inputData.input, null, 2),
        feedback_text: inputData.feedbackText || "",
      }
    );

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
    const days: Record<string, DayPlan> = {};
    for (const day of generatedPlan.days) {
      const convertMeal = (meal: {
        recipeId?: string;
        title: string;
        tags?: string[];
        ingredients?: string[];
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

    // バリデーション実行
    const validationResult = validatePlanNutrition(days, mealTargets);
    
    return {
      days,
      invalidMeals: validationResult.invalidMeals,
      isValid: validationResult.isValid,
    };
  },
});

/**
 * ステップ3: 単一の食事を修正する (foreach で使用)
 */
const fixSingleMealStep = createStep({
  id: "fixSingleMeal",
  inputSchema: z.object({
    date: z.string(),
    mealType: z.string(),
    target: z.any(),
    dislikedIngredients: z.array(z.string()),
    existingTitles: z.array(z.string()),
  }),
  outputSchema: z.object({
    date: z.string(),
    mealType: z.string(),
    meal: SingleMealSchema.nullable(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { date, mealType, target, dislikedIngredients, existingTitles } = inputData;
    const agent = mastra.getAgent("planGenerator");

    try {
      const mealTypeJa = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" }[mealType as "breakfast" | "lunch" | "dinner"];
      const prompt = `以下の条件で${mealTypeJa}のレシピを1つだけ生成してください。

【厳守：栄養素】
- カロリー: ${target.calories}kcal
- タンパク質: ${target.protein}g
- 脂質: ${target.fat}g
- 炭水化物: ${target.carbs}g

上記の数値をそのままnutritionに出力してください。自分で計算し直さないでください。

【避けるべき食材】
${dislikedIngredients.length > 0 ? dislikedIngredients.join(", ") : "なし"}

【避けるべきメニュー名（重複回避）】
${existingTitles.slice(0, 10).join(", ")}`;

      const result = await agent.generate(prompt, {
        structuredOutput: { schema: SingleMealSchema, jsonPromptInjection: true },
      });

      if (result.object) {
        return { date, mealType, meal: result.object };
      }
    } catch (e) {
      console.error(`[Workflow:fixSingleMeal] Failed for ${date} ${mealType}:`, e);
    }
    
    return { date, mealType, meal: null };
  },
});

/**
 * 修正サイクル用のサブワークフロー
 * 複数の不合格メニューを並列で修正してマージする
 */
const fixCycleWorkflow = createWorkflow({
  id: "fix-cycle",
  inputSchema: z.object({
    days: z.record(z.any()),
    invalidMeals: z.array(z.any()),
    mealTargets: z.custom<MealTargetNutrition>(),
    dislikedIngredients: z.array(z.string()),
    isValid: z.boolean(),
  }),
  outputSchema: z.object({
    days: z.record(z.any()),
    invalidMeals: z.array(z.any()),
    mealTargets: z.custom<MealTargetNutrition>(),
    dislikedIngredients: z.array(z.string()),
    isValid: z.boolean(),
  }),
})
  .then(createStep({
    id: "prepFixArray",
    inputSchema: z.object({
      days: z.record(z.any()),
      invalidMeals: z.array(z.any()),
      mealTargets: z.custom<MealTargetNutrition>(),
      dislikedIngredients: z.array(z.string()),
      isValid: z.boolean(),
    }),
    outputSchema: z.array(z.object({
      date: z.string(),
      mealType: z.string(),
      target: z.any(),
      dislikedIngredients: z.array(z.string()),
      existingTitles: z.array(z.string()),
    })),
    execute: async ({ inputData }) => {
      const { days, invalidMeals, dislikedIngredients } = inputData as {
        days: Record<string, DayPlan>;
        invalidMeals: MealValidationError[];
        dislikedIngredients: string[];
      };
      
      const existingTitles = Object.values(days).flatMap((d) => [
        d.meals.breakfast.title, d.meals.lunch.title, d.meals.dinner.title,
      ]);

      // foreach 用に配列に変換
      return invalidMeals.map(m => ({
        date: m.date,
        mealType: m.mealType,
        target: m.target,
        dislikedIngredients,
        existingTitles,
      }));
    }
  }))
  .foreach(fixSingleMealStep, { concurrency: 3 })
  .then(createStep({
    id: "mergeAndRevalidate",
    inputSchema: z.array(z.object({
      date: z.string(),
      mealType: z.string(),
      meal: SingleMealSchema.nullable(),
    })),
    outputSchema: z.object({
      days: z.record(z.any()),
      invalidMeals: z.array(z.any()),
      mealTargets: z.custom<MealTargetNutrition>(),
      dislikedIngredients: z.array(z.string()),
      isValid: z.boolean(),
    }),
    execute: async ({ inputData, getInitData }) => {
      const fixedResults = inputData;
      const initData = getInitData<{
        days: Record<string, DayPlan>;
        mealTargets: MealTargetNutrition;
        dislikedIngredients: string[];
      }>();
      const { days, mealTargets, dislikedIngredients } = initData;
      
      const updatedDays = { ...days };
      
      for (const res of fixedResults) {
        if (res.meal) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const target = (mealTargets as any)[res.mealType];
          const diff = Math.abs(res.meal.nutrition.calories - target.calories) / target.calories;
          
          if (diff <= 0.15) {
            const mealSlot: MealSlot = {
              recipeId: res.meal.recipeId,
              title: res.meal.title,
              status: "planned",
              nutrition: res.meal.nutrition,
              tags: res.meal.tags,
              ingredients: res.meal.ingredients,
              steps: res.meal.steps,
            };
            updatedDays[res.date].meals[res.mealType as "breakfast" | "lunch" | "dinner"] = mealSlot;
            updatedDays[res.date] = recalculateDayNutrition(updatedDays[res.date]);
          }
        }
      }

      const validationResult = validatePlanNutrition(updatedDays, mealTargets);
      
      return {
        days: updatedDays,
        invalidMeals: validationResult.invalidMeals,
        mealTargets,
        dislikedIngredients,
        isValid: validationResult.isValid,
      };
    }
  }));

/**
 * 最終的なフォールバックを適用するステップ
 * dountil 終了後も不合格な食事が残っている場合に固定メニューに差し替える
 */
const applyFinalFallbackStep = createStep({
  id: "applyFinalFallback",
  inputSchema: z.object({
    days: z.record(z.any()),
    invalidMeals: z.array(z.any()),
    mealTargets: z.custom<MealTargetNutrition>(),
    isValid: z.boolean(),
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

    console.log(`[Workflow] Applying fallback for ${invalidMeals.length} remaining invalid meals.`);
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
 * 14日間食事プラン生成ワークフロー (メイン)
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
  .then(generateInitialPlanStep)
  .map(async ({ inputData, getInitData }) => {
    const initData = getInitData() as { mealTargets: MealTargetNutrition };
    return {
      generatedPlan: inputData,
      mealTargets: initData.mealTargets,
    };
  })
  .then(validatePlanStep)
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
  .dountil(fixCycleWorkflow, async ({ inputData, iterationCount }) => {
    const result = inputData as { isValid: boolean };
    if (iterationCount >= 2) {
      console.log("[Workflow] Max iterations reached.");
      return true;
    }
    return result.isValid;
  })
  .then(applyFinalFallbackStep)
  .commit();
