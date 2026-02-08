/**
 * FaveFit - Plan Generator Input Type Definitions
 */

import { z } from "zod";
import { NutritionValuesSchema, PreferencesProfileSchema } from "./common";

/**
 * プラン生成エージェントへの入力スキーマ
 */
export const PlanGeneratorInputSchema = z.object({
  targetCalories: z.number().describe("1日の目標摂取カロリー"),
  pfc: NutritionValuesSchema.omit({ calories: true }).describe("目標PFCバランス(g)"),
  mealTargets: z
    .object({
      breakfast: NutritionValuesSchema,
      lunch: NutritionValuesSchema,
      dinner: NutritionValuesSchema,
    })
    .optional()
    .describe("各食事ごとの栄養目安"),
  preferences: PreferencesProfileSchema.extend({
    cuisines: z.record(z.number()).describe("好きな料理ジャンルのスコア"),
    flavorProfile: z.record(z.number()).describe("好きな味付けのスコア"),
    dislikedIngredients: z.array(z.string()).describe("苦手・アレルギー食材"),
  }).describe("ユーザーの嗜好設定"),
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
    .array(
      z.object({
        name: z.string().describe("食材名"),
        amount: z.string().describe("残量（例: 1/4個, 200g）"),
      })
    )
    .optional()
    .describe("冷蔵庫の在庫食材（優先的に使用）"),

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

export const DEFAULT_PLAN_DURATION_DAYS = 7;
