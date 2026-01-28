/**
 * FaveFit - Plan Generator Agent
 * 献立プラン生成エージェント
 */

import { z } from "zod";
import { runAgentWithSchema } from "../utils/agent-helpers";
import {
  NutritionValuesSchema,
  SingleMealSchema,
} from "../types/common";
import { PLAN_GENERATOR_INSTRUCTIONS } from "./prompts/plan-generator";

// ============================================
// 定数
// ============================================

export const DEFAULT_PLAN_DURATION_DAYS = 7;

// ============================================
// スキーマ定義
// ============================================

/**
 * 入力スキーマ
 */
export const PlanGeneratorInputSchema = z.object({
  targetCalories: z.number().describe("1日の目標カロリー"),
  pfc: z.object({
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
  mealTargets: z
    .object({
      breakfast: NutritionValuesSchema.describe("朝食の目標栄養素（20%）"),
      lunch: NutritionValuesSchema.describe("昼食の目標栄養素（40%）"),
      dinner: NutritionValuesSchema.describe("夕食の目標栄養素（40%）"),
    })
    .optional()
    .describe("各食事の目標栄養素（事前計算済み）"),
  preferences: z
    .object({
      cuisines: z.record(z.number()).optional(),
      flavorProfile: z.record(z.number()).optional(),
      dislikedIngredients: z.array(z.string()).optional(),
    })
    .optional()
    .describe("学習済み嗜好プロファイル"),
  favoriteRecipes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        tags: z.array(z.string()),
      })
    )
    .optional()
    .describe("お気に入りレシピ一覧"),
  cheapIngredients: z
    .array(z.string())
    .optional()
    .describe("現在安価な食材リスト"),
  cheatDayFrequency: z
    .enum(["weekly", "biweekly"])
    .describe("チートデイ頻度"),
  startDate: z.string().describe("プラン開始日 (YYYY-MM-DD)"),
});

/**
 * 1日分のプランスキーマ
 */
const DayPlanSchema = z.object({
  date: z.string().describe("日付 (YYYY-MM-DD)"),
  isCheatDay: z.boolean().describe("チートデイかどうか"),
  breakfast: SingleMealSchema,
  lunch: SingleMealSchema,
  dinner: SingleMealSchema,
});

/**
 * 出力スキーマ
 */
export const PlanGeneratorOutputSchema = z.object({
  days: z
    .array(DayPlanSchema)
    .describe(`${DEFAULT_PLAN_DURATION_DAYS}日間のプラン`),
});

/**
 * 部分プラン出力スキーマ（リフレッシュ用）
 */
export const PartialPlanOutputSchema = z.object({
  days: z.array(DayPlanSchema),
});

// ============================================
// 型エクスポート
// ============================================

export type PlanGeneratorInput = z.infer<typeof PlanGeneratorInputSchema>;
export type PlanGeneratorOutput = z.infer<typeof PlanGeneratorOutputSchema>;

// 共通型の再エクスポート
export { IngredientItemSchema, SingleMealSchema } from "../types/common";

// ============================================
// エージェント実行
// ============================================

/**
 * Plan Generator を実行
 */
export async function runPlanGenerator(
  prompt: string,
  userId?: string,
  schema: z.ZodType = PlanGeneratorOutputSchema
): Promise<z.infer<typeof schema>> {
  return runAgentWithSchema(
    PLAN_GENERATOR_INSTRUCTIONS,
    prompt,
    schema,
    "flash",
    "plan-generator",
    userId
  );
}

/**
 * 部分プランを生成（リフレッシュ用）
 */
export async function runPartialPlanGenerator(
  prompt: string,
  userId?: string
): Promise<z.infer<typeof PartialPlanOutputSchema>> {
  return runAgentWithSchema(
    PLAN_GENERATOR_INSTRUCTIONS,
    prompt,
    PartialPlanOutputSchema,
    "flash",
    "partial-plan-generator",
    userId
  );
}
