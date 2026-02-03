/**
 * FaveFit - AI共通型定義
 */

import { z } from "zod";

// ============================================
// 栄養素関連
// ============================================

/**
 * 栄養素値スキーマ
 */
export const NutritionValuesSchema = z.object({
  calories: z.number().describe("カロリー (kcal)"),
  protein: z.number().describe("タンパク質 (g)"),
  fat: z.number().describe("脂質 (g)"),
  carbs: z.number().describe("炭水化物 (g)"),
});

export type NutritionValues = z.infer<typeof NutritionValuesSchema>;

// ============================================
// 食材関連
// ============================================

/**
 * 食材アイテムスキーマ
 */
export const IngredientItemSchema = z.object({
  name: z.string().describe("材料名"),
  amount: z.string().describe("分量（例: 100g, 1/2個）"),
});

export type IngredientItem = z.infer<typeof IngredientItemSchema>;

// ============================================
// 嗜好プロファイル
// ============================================

/**
 * 学習済み嗜好プロファイルスキーマ
 */
export const PreferencesProfileSchema = z.object({
  cuisines: z.record(z.number()).optional().describe("ジャンル別スコア"),
  flavorProfile: z.record(z.number()).optional().describe("味付け別スコア"),
  dislikedIngredients: z.array(z.string()).optional().describe("苦手な食材"),
});

export type PreferencesProfile = z.infer<typeof PreferencesProfileSchema>;

// ============================================
// 食事関連
// ============================================

/**
 * 食事タイプ
 */
export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner"]);
export type MealType = z.infer<typeof MealTypeSchema>;

/**
 * 単一食事スキーマ
 */
export const SingleMealSchema = z.object({
  recipeId: z.string().describe("ユニークなレシピID"),
  title: z.string().describe("レシピ名"),
  tags: z.array(z.string()).describe("タグ（和食、洋食など）"),
  ingredients: z.array(IngredientItemSchema).describe("材料リスト"),
  steps: z.array(z.string()).describe("調理手順"),
  nutrition: NutritionValuesSchema,
});

export type SingleMeal = z.infer<typeof SingleMealSchema>;

// ============================================
// 結果ラッパー
// ============================================

/**
 * エージェント実行結果の型
 */
export type AgentResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

/**
 * 成功結果を作成
 */
export function success<T>(data: T): AgentResult<T> {
  return { success: true, data };
}

/**
 * 失敗結果を作成
 */
export function failure<T>(error: string): AgentResult<T> {
  return { success: false, error };
}
