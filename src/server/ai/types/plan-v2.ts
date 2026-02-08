import { z } from "zod";
import { NutritionValuesSchema, IngredientItemSchema } from "./common";

// Phase 1: スケルトン（概要）
export const IngredientPoolSchema = z.object({
  period: z.string().describe("対象となる日付の範囲 (例: 2026-02-07 to 2026-02-09)"),
  ingredients: z.array(z.string()).describe("この期間内で使い回す主要な食材のリスト"),
  strategy: z.string().describe("この期間の食材使い回し戦略の解説"),
});

export type IngredientPool = z.infer<typeof IngredientPoolSchema>;

export const MealSkeletonV2Schema = z.object({
  title: z.string().describe("メニュー名（例: 鶏胸肉の照り焼き）"),
  mainIngredients: z.array(z.string()).describe("主要食材（例: [鶏胸肉, キャベツ]）"),
  approxCalories: z.number().describe("概算カロリー"),
});

export const DailySkeletonSchema = z.object({
  date: z.string(),
  meals: z.object({
    breakfast: MealSkeletonV2Schema,
    lunch: MealSkeletonV2Schema,
    dinner: MealSkeletonV2Schema,
    snack: MealSkeletonV2Schema.optional().describe("目標カロリー調整用の間食（必要時のみ）"),
  }),
});

export const WeeklySkeletonSchema = z.object({
  days: z.array(DailySkeletonSchema),
  ingredientPools: z.array(IngredientPoolSchema).describe("数日単位のブロックごとの食材計画"),
});

// Phase 2: 詳細（1日分）
export const DetailedMealV2Schema = z.object({
  title: z.string(), // スケルトンから継承・固定
  ingredients: z.array(IngredientItemSchema).describe("詳細な分量付き食材リスト"),
  steps: z.array(z.string()).describe("調理手順"),
  nutrition: NutritionValuesSchema.describe("詳細な栄養価"),
});

export const DailyDetailedPlanSchema = z.object({
  date: z.string(),
  meals: z.object({
    breakfast: DetailedMealV2Schema,
    lunch: DetailedMealV2Schema,
    dinner: DetailedMealV2Schema,
    snack: DetailedMealV2Schema.optional(),
  }),
});

export const ChunkDetailedPlanSchema = z.object({
  days: z.array(DailyDetailedPlanSchema).describe("期間内の日次詳細プラン"),
});

export type WeeklySkeleton = z.infer<typeof WeeklySkeletonSchema>;
export type DailySkeleton = z.infer<typeof DailySkeletonSchema>;
export type DailyDetailedPlan = z.infer<typeof DailyDetailedPlanSchema>;
export type ChunkDetailedPlan = z.infer<typeof ChunkDetailedPlanSchema>;
