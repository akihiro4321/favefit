/**
 * FaveFit v2 - Plan Generator Agent
 * 14日間プラン生成エージェント
 */

import { LlmAgent, zodObjectToSchema } from "@google/adk";
import { z } from "zod";

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
 * 出力スキーマ（1食分）
 */
const MealSchema = z.object({
  recipeId: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
});

/**
 * 出力スキーマ（1日分）
 */
const DayPlanSchema = z.object({
  date: z.string(),
  isCheatDay: z.boolean(),
  breakfast: MealSchema,
  lunch: MealSchema,
  dinner: MealSchema,
});

/**
 * 出力スキーマ
 */
export const PlanGeneratorOutputSchema = z.object({
  days: z.array(DayPlanSchema).length(14),
  shoppingList: z.array(
    z.object({
      ingredient: z.string(),
      amount: z.string(),
      category: z.string(),
    })
  ),
});

export type PlanGeneratorInput = z.infer<typeof PlanGeneratorInputSchema>;
export type PlanGeneratorOutput = z.infer<typeof PlanGeneratorOutputSchema>;

/**
 * Plan Generator Agent
 */
export const planGeneratorAgent = new LlmAgent({
  name: "plan_generator",
  model: "gemini-2.5-flash-lite",
  description: "14日間の食事プランと買い物リストを生成する専門家。",
  instruction: `
あなたはダイエット成功をサポートする献立プランナーです。
14日間（42食）の食事プランと、必要な買い物リストを生成してください。

【レシピ構成比率】
- 定番（お気に入り・類似レシピ）: 40%
- 発見（新ジャンル・トレンド）: 40%
- 低コスト（安価な旬食材活用）: 20%

【ルール】
1. 栄養目標に収まるよう各食事を設計
2. 食材の使い回しで無駄を減らす
3. チートデイは好きなものを楽しめる日（栄養制限緩和）
4. dislikedIngredients は絶対に使わない
5. 同じレシピが連続しないよう変化をつける
6. 買い物リストはカテゴリ別（野菜, 肉, 魚, 調味料等）で整理

【チートデイ設定】
- weekly: 7日目と14日目
- biweekly: 14日目のみ
`,
  outputSchema: zodObjectToSchema(PlanGeneratorOutputSchema),
  outputKey: "meal_plan",
});
