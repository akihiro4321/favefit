/**
 * FaveFit - Menu Suggester Function
 * 臨機応変なメニュー提案関数
 */

import { z } from "zod";
import { callModelWithSchema } from "../utils/agent-helpers";
import {
  NutritionValuesSchema,
  IngredientItemSchema,
  PreferencesProfileSchema,
} from "../types/common";

// ============================================
// スキーマ定義
// ============================================

/**
 * 入力スキーマ
 */
export const MenuAdjusterInputSchema = z.object({
  availableIngredients: z
    .array(IngredientItemSchema)
    .describe("手元にある食材リスト（分量込み）"),
  targetNutrition: NutritionValuesSchema.describe("本日の残り目標栄養素"),
  userComment: z
    .string()
    .optional()
    .describe("ユーザーからの追加要望（例: もっと辛く、さっぱりしたもの）"),
  previousSuggestions: z
    .array(z.string())
    .optional()
    .describe("すでに提案して却下されたレシピ名"),
  preferences:
    PreferencesProfileSchema.optional().describe("学習済み嗜好プロファイル"),
});

/**
 * 提案レシピスキーマ
 */
const SuggestedRecipeSchema = z.object({
  recipeId: z.string(),
  title: z.string(),
  description: z.string().describe("なぜこのレシピを提案したか"),
  tags: z.array(z.string()),
  ingredients: z.array(IngredientItemSchema),
  additionalIngredients: z
    .array(z.string())
    .describe("追加で必要な食材（手元にないもの）"),
  steps: z.array(z.string()),
  nutrition: NutritionValuesSchema,
});

/**
 * 出力スキーマ
 */
export const MenuAdjusterOutputSchema = z.object({
  suggestions: z.array(SuggestedRecipeSchema).length(3),
  message: z.string().describe("ユーザーへの一言メッセージ"),
});

// ============================================
// 型エクスポート
// ============================================

export type MenuAdjusterInput = z.infer<typeof MenuAdjusterInputSchema>;
export type MenuAdjusterOutput = z.infer<typeof MenuAdjusterOutputSchema>;

// ============================================
// プロンプト
// ============================================

import { MENU_ADJUSTER_INSTRUCTIONS } from "../prompts/functions/menu-suggester";
import { FAST_MODEL } from "../config";

// ============================================
// 関数実行
// ============================================

/**
 * Menu Suggestions を生成
 */
export async function generateMenuSuggestions(
  prompt: string
): Promise<MenuAdjusterOutput> {
  return callModelWithSchema(
    MENU_ADJUSTER_INSTRUCTIONS,
    prompt,
    MenuAdjusterOutputSchema,
    FAST_MODEL
  );
}
