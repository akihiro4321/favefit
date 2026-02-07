import { z } from "zod";

/**
 * 食事プラン生成エージェントの入力スキーマ
 */

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
      })
    )
    .describe("お気に入りレシピのリスト（これを参考にプランに組み込む）"),
  cheapIngredients: z.array(z.string()).describe("現在安価な食材（低コストプラン用）"),
  cheatDayFrequency: z
    .enum(["weekly", "biweekly"])
    .describe("チートデイ頻度"),
  startDate: z.string().describe("プラン開始日 (YYYY-MM-DD)"),
  
  // 食事スロットごとの設定モードと入力テキスト
  mealSettings: z.object({
    breakfast: z.object({ mode: z.enum(["auto", "fixed", "custom"]), text: z.string() }),
    lunch: z.object({ mode: z.enum(["auto", "fixed", "custom"]), text: z.string() }),
    dinner: z.object({ mode: z.enum(["auto", "fixed", "custom"]), text: z.string() }),
  }).optional(),

  // 汎用的な食事固定設定
  fixedMeals: z
    .object({
      breakfast: MealSkeletonSchema.optional(),
      lunch: MealSkeletonSchema.optional(),
      dinner: MealSkeletonSchema.optional(),
    })
    .optional()
    .describe("特定の時間枠で毎日同じものを食べる場合のレシピ"),

  // 食事スロットごとの個別制約
  mealConstraints: z
    .object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      dinner: z.string().optional(),
    })
    .optional()
    .describe("食事ごとの特別な要望（例：「夕食は軽めのサラダのみ」など）"),

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
  adaptiveDirective: z.object({
    baseCalories: z.number().describe("プラン生成の基準とする1日摂取カロリー"),
    instructions: z.array(z.string()).describe("現状の食生活を考慮した追加指示リスト"),
  }).optional(),

  currentDiet: z.object({
    breakfast: z.string().optional(),
    lunch: z.string().optional(),
    dinner: z.string().optional(),
    snack: z.string().optional(),
  }).optional().describe("ユーザーの現状の食生活"),


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

/**
 * 出力スキーマ
 */
const MealSlotOutputSchema = z.object({
  title: z.string().describe("料理名"),
  nutrition: z.object({
    calories: z.number().describe("推定カロリー(kcal)"),
    protein: z.number().describe("推定タンパク質(g)"),
    fat: z.number().describe("推定脂質(g)"),
    carbs: z.number().describe("推定炭水化物(g)"),
  }),
  tags: z.array(z.string()).describe("料理の特徴を表すタグ"),
});

export const PlanGeneratorOutputSchema = z.object({
  days: z.array(
    z.object({
      date: z.string().describe("日付 (YYYY-MM-DD)"),
      isCheatDay: z.boolean().describe("この日がチートデイかどうか"),
      meals: z.object({
        breakfast: MealSlotOutputSchema,
        lunch: MealSlotOutputSchema,
        dinner: MealSlotOutputSchema,
      }),
      totalNutrition: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbs: z.number(),
      }),
    })
  ).describe("各日程の食事プラン"),
});

export type PlanGeneratorOutput = z.infer<typeof PlanGeneratorOutputSchema>;

/**
 * 部分修正用の出力スキーマ
 */
export const PartialPlanOutputSchema = z.object({
  meals: z.array(
    z.object({
      key: z.string().describe("食事キー (YYYY-MM-DD_mealType)"),
      recipe: MealSlotOutputSchema,
    })
  ),
});

// ============================================
// 定数
// ============================================

export const DEFAULT_PLAN_DURATION_DAYS = 7;

// ============================================
// エージェント実行
// ============================================

import { runAgentWithSchema } from "../utils/agent-helpers";
import { PLAN_GENERATOR_INSTRUCTIONS } from "./prompts/plan-generator";

/**
 * 全日程の食事プランを生成
 */
export async function runPlanGenerator(
  prompt: string,
  userId?: string,
  processName?: string
): Promise<PlanGeneratorOutput> {
  return runAgentWithSchema(
    PLAN_GENERATOR_INSTRUCTIONS,
    prompt,
    PlanGeneratorOutputSchema,
    "flash",
    "plan-generator",
    userId,
    processName
  );
}

/**
 * 特定の食事スロットのみを修正・再生成
 */
export async function runPartialPlanGenerator(
  prompt: string,
  userId?: string,
  processName?: string
): Promise<z.infer<typeof PartialPlanOutputSchema>> {
  return runAgentWithSchema(
    PLAN_GENERATOR_INSTRUCTIONS,
    prompt,
    PartialPlanOutputSchema,
    "flash",
    "partial-plan-generator",
    userId,
    processName
  );
}
