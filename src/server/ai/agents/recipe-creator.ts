/**
 * FaveFit - Recipe Creator Agent
 * レシピ詳細生成エージェント
 */

import { z } from "zod";
import { runAgentWithSchema } from "../utils/agent-helpers";
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

import { RECIPE_CREATOR_INSTRUCTIONS } from "./prompts/recipe-creator";

// ============================================
// エージェント実行
// ============================================

/**
 * Recipe Creator を実行
 */
export async function runRecipeCreator(
  prompt: string,
  userId?: string,
  processName?: string
): Promise<Recipe> {
  return runAgentWithSchema(
    RECIPE_CREATOR_INSTRUCTIONS,
    prompt,
    RecipeOutputSchema,
    "flash",
    "recipe-creator",
    userId,
    processName
  );
}

