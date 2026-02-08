import { z } from "zod";
import { SingleMealSchema } from "../types/common";
import { callModelWithSchema } from "../utils/agent-helpers";
import {
  PLAN_GENERATOR_INSTRUCTIONS,
  getFillPlanPrompt,
  getBatchMealFixPrompt,
} from "../prompts/agents/plan-generator";
import { GEMINI_3_FLASH_MODEL } from "../config";
import {
  MealTargetNutrition,
  NutritionValues,
} from "@/lib/tools/mealNutritionCalculator";
import {
  recalculateDayNutrition,
  validatePlanNutrition,
} from "@/lib/tools/nutritionValidator";
import { DayPlan, MealSlot } from "@/lib/schema";
import { auditPlanAnchors } from "../functions/plan-auditor";

// ============================================
// 定数
// ============================================

export const DEFAULT_PLAN_DURATION_DAYS = 7;

// ============================================
// スキーマ定義
// ============================================

export const MealSkeletonSchema = z.object({
  recipeId: z.string().optional(),
  title: z.string().describe("料理名"),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
  tags: z.array(z.string()).describe("タグ（和食、低脂質、等）"),
});

export type MealSkeleton = z.infer<typeof MealSkeletonSchema>;

export const PlanGeneratorInputSchema = z.object({
  targetCalories: z.number().describe("1日の目標摂取カロリー"),
  pfc: z.object({
    protein: z.number().describe("目標タンパク質(g)"),
    fat: z.number().describe("目標脂質(g)"),
    carbs: z.number().describe("目標炭水化物(g)"),
  }),
  mealTargets: z
    .object({
      breakfast: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbs: z.number(),
      }),
      lunch: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbs: z.number(),
      }),
      dinner: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbs: z.number(),
      }),
    })
    .optional()
    .describe("各食事ごとの栄養目安"),
  preferences: z.object({
    cuisines: z.record(z.number()).describe("好きな料理ジャンルのスコア"),
    flavorProfile: z.record(z.number()).describe("好きな味付けのスコア"),
    dislikedIngredients: z.array(z.string()).describe("苦手・アレルギー食材"),
  }),
  favoriteRecipes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .describe("お気に入りレシピのリスト（これを参考にプランに組み込む）"),
  cheapIngredients: z
    .array(z.string())
    .describe("現在安価な食材（低コストプラン用）"),
  cheatDayFrequency: z.enum(["weekly", "biweekly"]).describe("チートデイ頻度"),
  startDate: z.string().describe("プラン開始日 (YYYY-MM-DD)"),

  // 食事スロットごとの設定モードと入力テキスト
  mealSettings: z
    .object({
      breakfast: z.object({
        mode: z.enum(["auto", "fixed", "custom"]),
        text: z.string(),
      }),
      lunch: z.object({
        mode: z.enum(["auto", "fixed", "custom"]),
        text: z.string(),
      }),
      dinner: z.object({
        mode: z.enum(["auto", "fixed", "custom"]),
        text: z.string(),
      }),
    })
    .optional(),

  mealPrep: z
    .object({
      prepDay: z.string().describe("作り置きを行う日 (YYYY-MM-DD)"),
      servings: z.number().describe("メイン料理を何食分まとめて作るか"),
    })
    .optional()
    .describe("作り置き（バルク調理）の設定"),

  fridgeIngredients: z
    .array(z.string())
    .optional()
    .describe("冷蔵庫の余り物食材（優先的に使用）"),

  // 適応型プランニング用: AIへの具体的な方針指示
  adaptiveDirective: z
    .object({
      baseCalories: z
        .number()
        .describe("プラン生成の基準とする1日摂取カロリー"),
      instructions: z
        .array(z.string())
        .describe("現状の食生活を考慮した追加指示リスト"),
    })
    .optional(),

  currentDiet: z
    .object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      dinner: z.string().optional(),
      snack: z.string().optional(),
    })
    .optional()
    .describe("ユーザーの現状の食生活"),

  lifestyle: z
    .object({
      availableTime: z.enum(["short", "medium", "long"]).optional(),
      maxCookingTime: z.number().optional().describe("最大許容調理時間(分)"),
      timeSavingPriority: z
        .enum(["breakfast", "lunch", "dinner"])
        .optional()
        .describe("特に手間を減らしたい食事"),
    })
    .optional()
    .describe("生活スタイル設定"),
});

export type PlanGeneratorInput = z.infer<typeof PlanGeneratorInputSchema>;

export const PlanGeneratorOutputSchema = z.object({
  days: z
    .array(
      z.object({
        date: z.string().describe("日付 (YYYY-MM-DD)"),
        isCheatDay: z.boolean().describe("この日がチートデイかどうか"),
        meals: z.object({
          breakfast: SingleMealSchema,
          lunch: SingleMealSchema,
          dinner: SingleMealSchema,
        }),
        totalNutrition: z.object({
          calories: z.number(),
          protein: z.number(),
          fat: z.number(),
          carbs: z.number(),
        }),
      }),
    )
    .describe("各日程の食事プラン"),
});

export type PlanGeneratorOutput = z.infer<typeof PlanGeneratorOutputSchema>;

/**
 * 部分修正用の出力スキーマ
 */
export const PartialPlanOutputSchema = z.object({
  meals: z.array(
    z.object({
      key: z.string().describe("食事キー (YYYY-MM-DD_mealType)"),
      recipe: SingleMealSchema,
    }),
  ),
});

/**
 * 一括修正用の出力スキーマ
 */
const BatchFixOutputSchema = z.object({
  meals: z.array(
    z.object({
      key: z
        .string()
        .describe("日付とmealTypeを結合したキー（例：2024-01-01_breakfast）"),
      recipe: SingleMealSchema,
    }),
  ),
});

// ============================================
// 内部ヘルパー
// ============================================

/**
 * AI出力をアプリのMealSlot形式に変換
 */
function convertToInternalFormat(
  generatedPlan: PlanGeneratorOutput,
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
      nutrition: {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
      };
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
 * Anchor & Fill プロセスの実行
 */
async function runAnchorAndFillProcess(
  input: PlanGeneratorInput,
  mealTargets: MealTargetNutrition,
  feedbackText?: string,
) {
  const duration = DEFAULT_PLAN_DURATION_DAYS;

  // 0. 適応型プランニング情報の取得 (Workflowから渡されたものを使用)
  const totalTargetCalories =
    mealTargets.breakfast.calories +
    mealTargets.lunch.calories +
    mealTargets.dinner.calories;

  const adaptiveDirective = input.adaptiveDirective || {
    baseCalories: totalTargetCalories,
    instructions: [],
  };

  // 1. Auditorの実行
  const mealSettings = input.mealSettings || {
    breakfast: { mode: "auto", text: "" },
    lunch: { mode: "auto", text: "" },
    dinner: { mode: "auto", text: "" },
  };

  const dailyTarget = {
    calories: totalTargetCalories,
    protein:
      mealTargets.breakfast.protein +
      mealTargets.lunch.protein +
      mealTargets.dinner.protein,
    fat:
      mealTargets.breakfast.fat +
      mealTargets.lunch.fat +
      mealTargets.dinner.fat,
    carbs:
      mealTargets.breakfast.carbs +
      mealTargets.lunch.carbs +
      mealTargets.dinner.carbs,
  };

  const auditorResult = await auditPlanAnchors(mealSettings, dailyTarget);

  // 2. スロット別ターゲットの計算
  const anchorNutritionSum = auditorResult.anchors.reduce(
    (acc, anchor) => ({
      calories: acc.calories + anchor.estimatedNutrition.calories,
      protein: acc.protein + anchor.estimatedNutrition.protein,
      fat: acc.fat + anchor.estimatedNutrition.fat,
      carbs: acc.carbs + anchor.estimatedNutrition.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  const remainingCalories = Math.max(
    0,
    adaptiveDirective.baseCalories - anchorNutritionSum.calories,
  );

  const allMealTypes = ["breakfast", "lunch", "dinner"] as const;
  const fixedTypes = auditorResult.anchors.map((a) => a.mealType);
  const autoTypes = allMealTypes.filter((type) => !fixedTypes.includes(type));

  const standardRatios = { breakfast: 0.2, lunch: 0.4, dinner: 0.4 };
  const autoRatioSum = autoTypes.reduce(
    (sum, type) => sum + standardRatios[type],
    0,
  );

  const slotTargetsDescription = allMealTypes
    .map((type) => {
      if (fixedTypes.includes(type)) {
        const anchor = auditorResult.anchors.find((a) => a.mealType === type)!;
        return `- ${type.toUpperCase()} (ANCHOR):\n  - title: "${anchor.resolvedTitle}"\n  - nutrition: ${JSON.stringify(anchor.estimatedNutrition)}\n  - note: "一字一句変えずにそのまま出力してください。"`;
      }

      const ratio = autoRatioSum > 0 ? standardRatios[type] / autoRatioSum : 0;
      const targetCal = Math.round(remainingCalories * ratio);

      const remainingP = Math.max(
        0,
        dailyTarget.protein - anchorNutritionSum.protein,
      );
      const remainingF = Math.max(0, dailyTarget.fat - anchorNutritionSum.fat);
      const remainingC = Math.max(
        0,
        dailyTarget.carbs - anchorNutritionSum.carbs,
      );

      const targetP = Math.round(remainingP * ratio);
      const targetF = Math.round(remainingF * ratio);
      const targetC = Math.round(remainingC * ratio);

      const baselineContext = `目標カロリーは${targetCal}kcalです。普段の摂取量を考慮し、無理のない範囲で調整されています。`;

      return `- ${type.toUpperCase()} (AUTO):\n  - target: { calories: ${targetCal}, protein: ${targetP}, fat: ${targetF}, carbs: ${targetC} }\n  - baseline_context: "${baselineContext}"`;
    })
    .join("\n\n");

  // 3. プロンプト作成と実行
  const user_info = JSON.stringify({ ...input, adaptiveDirective }, null, 2);
  const prompt = getFillPlanPrompt({
    duration,
    user_info,
    slot_targets: slotTargetsDescription,
    feedback_text: feedbackText || "",
  });

  const generatedPlan = await callModelWithSchema(
    PLAN_GENERATOR_INSTRUCTIONS,
    prompt,
    PlanGeneratorOutputSchema,
    GEMINI_3_FLASH_MODEL,
  );

  return {
    generatedPlan,
    resolvedAnchors: auditorResult.anchors,
  };
}

// ============================================
// エージェント実行
// ============================================

/**
 * 全日程の食事プランを自律的に生成・修正して返す
 */
export async function runPlanGenerator(
  input: PlanGeneratorInput,
  mealTargets: MealTargetNutrition,
  feedbackText?: string,
): Promise<{
  days: Record<string, DayPlan>;
  isValid: boolean;
  invalidMealsCount: number;
}> {
  // Step 1: Anchor & Fill
  console.log("[PlanGenerator] Step 1: Anchor & Fill Process");
  const { generatedPlan, resolvedAnchors } = await runAnchorAndFillProcess(
    input,
    mealTargets,
    feedbackText,
  );

  // Step 1.5: 内部形式への変換と固定スロットの上書き
  const days = convertToInternalFormat(generatedPlan);
  for (const day of generatedPlan.days) {
    for (const anchor of resolvedAnchors) {
      const mealType = anchor.mealType as "breakfast" | "lunch" | "dinner";
      // AI生成結果をAuditorの正確な情報で上書き
      days[day.date].meals[mealType] = {
        ...days[day.date].meals[mealType],
        title: anchor.resolvedTitle,
        nutrition: anchor.estimatedNutrition,
      };
      days[day.date] = recalculateDayNutrition(days[day.date]);
    }
  }

  // Step 2: バリデーション
  console.log("[PlanGenerator] Step 2: Validation");
  const trustedFixedMeals = resolvedAnchors.reduce(
    (acc, anchor) => ({
      ...acc,
      [anchor.mealType]: { title: anchor.resolvedTitle },
    }),
    {},
  );

  const validationResult = validatePlanNutrition(
    days,
    mealTargets,
    undefined,
    trustedFixedMeals,
  );

  // Step 3: 不合格分の一括修正
  const currentDays = days;
  let invalidMeals = validationResult.invalidMeals;

  if (invalidMeals.length > 0) {
    console.log(
      `[PlanGenerator] Step 3: Fixing ${invalidMeals.length} invalid meals...`,
    );
    const existingTitles = Object.values(currentDays).flatMap((d) => [
      d.meals.breakfast.title,
      d.meals.lunch.title,
      d.meals.dinner.title,
    ]);

    const mealTypeJaMap = {
      breakfast: "朝食",
      lunch: "昼食",
      dinner: "夕食",
    } as const;
    const invalidMealInfos = invalidMeals.map((m) => ({
      date: m.date,
      mealType: m.mealType,
      mealTypeJa: mealTypeJaMap[m.mealType],
      target: m.target,
    }));

    const fixPrompt = getBatchMealFixPrompt({
      invalidMeals: invalidMealInfos,
      dislikedIngredients: input.preferences.dislikedIngredients,
      existingTitles,
      mealSettings: input.mealSettings,
    });

    try {
      const fixedOutput = await callModelWithSchema(
        PLAN_GENERATOR_INSTRUCTIONS,
        fixPrompt,
        BatchFixOutputSchema,
        GEMINI_3_FLASH_MODEL,
      );

      for (const fixedMeal of fixedOutput.meals) {
        const [date, mealType] = fixedMeal.key.split("_");
        if (
          !date ||
          !mealType ||
          !["breakfast", "lunch", "dinner"].includes(mealType)
        )
          continue;

        const target = mealTargets[mealType as keyof MealTargetNutrition];
        const diff =
          Math.abs(fixedMeal.recipe.nutrition.calories - target.calories) /
          target.calories;

        if (diff <= 0.15) {
          const mealSlot: MealSlot = {
            recipeId: `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: fixedMeal.recipe.title,
            status: "planned",
            nutrition: fixedMeal.recipe.nutrition,
            tags: fixedMeal.recipe.tags,
            ingredients: fixedMeal.recipe.ingredients || [],
            steps: fixedMeal.recipe.steps || [],
          };
          currentDays[date].meals[
            mealType as "breakfast" | "lunch" | "dinner"
          ] = mealSlot;
          currentDays[date] = recalculateDayNutrition(currentDays[date]);
        }
      }

      // 再バリデーション
      const reValidation = validatePlanNutrition(currentDays, mealTargets);
      invalidMeals = reValidation.invalidMeals;
    } catch (e) {
      console.error("[PlanGenerator] Error during batch fix:", e);
    }
  }

  // Step 4: 最終フォールバック
  if (invalidMeals.length > 0) {
    console.log(
      `[PlanGenerator] Step 4: Applying fallback for ${invalidMeals.length} meals.`,
    );
    for (const { date, mealType } of invalidMeals) {
      const target = mealTargets[mealType];
      currentDays[date].meals[mealType] = getFallbackMeal(mealType, target);
      currentDays[date] = recalculateDayNutrition(currentDays[date]);
    }
  }

  return {
    days: currentDays,
    isValid: invalidMeals.length === 0,
    invalidMealsCount: invalidMeals.length,
  };
}

/**
 * 特定の食事スロットのみを修正・再生成 (Partial)
 */
export async function runPartialPlanGenerator(
  prompt: string,
): Promise<z.infer<typeof PartialPlanOutputSchema>> {
  return callModelWithSchema(
    PLAN_GENERATOR_INSTRUCTIONS,
    prompt,
    PartialPlanOutputSchema,
    GEMINI_3_FLASH_MODEL,
  );
}
