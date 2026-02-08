/**
 * FaveFit - Recipe Generator Function
 * レシピ詳細生成関数
 */

import { z } from "zod";
import { callModelWithSchema } from "../utils/agent-helpers";
import { NutritionValuesSchema, IngredientItemSchema } from "../types/common";

// ============================================
// スキーマ定義
// ============================================

export const RecipeOutputSchema = z.object({
  title: z.string().describe("レシピの名前"),
  description: z.string().describe("レシピの短い魅力的な説明"),
  ingredients: z.array(IngredientItemSchema).describe("材料リスト"),
  instructions: z.array(z.string()).describe("調理手順（ステップ形式）"),
  nutrition: NutritionValuesSchema.describe("このレシピ1人分あたりの栄養価"),
  cookingTime: z.number().describe("推定調理時間（分）"),
});

export type Recipe = z.infer<typeof RecipeOutputSchema>;

// ============================================
// プロンプト
// ============================================

import { RECIPE_CREATOR_INSTRUCTIONS } from "../prompts/functions/recipe-generator";
import { GEMINI_3_FLASH_MODEL } from "../config";

// ============================================
// 関数実行
// ============================================

/**
 * レシピデータを生成
 */
export async function generateRecipeData(prompt: string): Promise<Recipe> {
  return callModelWithSchema(
    RECIPE_CREATOR_INSTRUCTIONS,
    prompt,
    RecipeOutputSchema,
    GEMINI_3_FLASH_MODEL
  );
}
