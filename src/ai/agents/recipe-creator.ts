/**
 * FaveFit - Recipe Creator Agent
 * レシピ詳細生成エージェント
 */

import { z } from "zod";
import { runAgentWithSchema, formatArray, formatPreferences } from "../utils/agent-helpers";
import { NutritionValuesSchema, IngredientItemSchema } from "../types/common";
import { UserDocument } from "@/lib/db/firestore/userRepository";

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
  userId?: string
): Promise<Recipe> {
  return runAgentWithSchema(
    RECIPE_CREATOR_INSTRUCTIONS,
    prompt,
    RecipeOutputSchema,
    "flash",
    "recipe-creator",
    userId
  );
}

// ============================================
// プロンプト構築ヘルパー
// ============================================

interface TargetNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * レシピ生成用のプロンプトを構築
 */
export function buildRecipePrompt(
  userDoc: UserDocument | null,
  mood: string,
  targetNutrition: TargetNutrition
): string {
  const basePrompt = `
【リクエスト内容】
- 今日の気分: ${mood}
- 目標栄養素: カロリー${targetNutrition.calories}kcal, タンパク質${targetNutrition.protein}g, 脂質${targetNutrition.fat}g, 炭水化物${targetNutrition.carbs}g
`;

  if (!userDoc) {
    return basePrompt;
  }

  const { profile, learnedPreferences } = userDoc;
  const allergies = formatArray(profile.physical.allergies, "なし");

  return (
    basePrompt +
    `
【ユーザーの好み情報】
- 好きな食材: ${formatArray(profile.physical.favoriteIngredients)}
- 苦手な食材: ${formatArray(learnedPreferences.dislikedIngredients)}
- アレルギー: ${allergies}
- 料理スキル: ${profile.lifestyle.cookingSkillLevel || "intermediate"}
- かけられる時間: ${profile.lifestyle.availableTime || "medium"}
- 過去の傾向: ${formatPreferences(learnedPreferences.cuisines, learnedPreferences.flavorProfile)}

【重要】
1. **リクエストの最優先:** 「今日の気分」に具体的な料理名や食材（例: エスカルゴ、ステーキ等）が含まれる場合、入手難易度や調理時間を問わず、**必ずその食材を使用したレシピ**を提案してください。
2. **安全性の確保:** アレルギー食材 (${allergies}) は絶対に使用しないでください。
3. **好みの反映:** 苦手な食材も可能な限り避けてください。好きな食材を積極的に活用し、ユーザーのスキルレベルと時間に合ったレシピを考案してください。
`
  );
}
