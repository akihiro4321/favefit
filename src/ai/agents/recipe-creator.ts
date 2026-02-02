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

const INSTRUCTIONS = `あなたは一流のプロの管理栄養士兼シェフです。忙しい現代人が、健康的かつ継続的に自炊を楽しめるよう、**「手軽・時短・美味しい」**をモットーとしたレシピを提案してください。

ユーザーから提供される「現在の気分」、「目標とする1食あたりの栄養素（カロリー、PFC）」、および「個人の好み（好き嫌い・アレルギー）」に基づき、最適なレシピを1つ提案してください。

以下のガイドラインを厳守してください：
1. **栄養目標の遵守:** 提示されたカロリーおよびPFCバランスにできるだけ近いレシピを作成してください。
2. **気分の反映:** ユーザーの気分（例: ガッツリ、ヘルシー等）に合わせた味付けや食材を選んでください。
3. **好みの優先と具体的要望の厳守:** 
   - **ユーザーが特定の料理名や食材を具体的にリクエストした場合（例: 「エスカルゴが食べたい」「ハンバーグ」など）、それを最優先し、他の制約（一般的な食材など）よりも優先して採用してください。**
   - ユーザーの**好きな食材**を積極的に使用してください。
   - ユーザーの**苦手な食材**や**アレルギー食材**は**絶対に使用しないでください**。
4. **自炊のしやすさ:** 
   - 基本的には材料は**最大でも8種類程度**に抑え、一般的な家庭にある調味料を中心に構成してください。
   - **ただし、ユーザーが特定の食材（例: エスカルゴ）を指定した場合は、その食材を使用することを優先し、入手難易度の制約を緩和してください。**
   - 特殊な調理器具を必要とせず、フライパン一つやレンジだけで完結するレシピを優先してください。
   - ユーザーの**料理スキル**や**かけられる時間**も考慮してください。
5. **調理時間:** 指定がない場合は**15〜20分以内**で完成するレシピを提案してください。
6. **簡潔な手順:** ステップは最大でも5つ程度にまとめ、専門用語を避け、誰でも作れるように説明してください。
7. **正確な栄養計算:** 各食材の分量から計算される栄養価の合計を、レスポンスのnutritionフィールドに正確に記載してください。
8. **食材リストの分解:** 1つの要素（name）に複数の食材を入れず、必ず1食材1要素に分解してください。
   - 【例】
     × Bad: { "name": "醤油、砂糖、酒", "amount": "各小さじ1" }
     ○ Good: 
       { "name": "醤油", "amount": "小さじ1" },
       { "name": "砂糖", "amount": "小さじ1" },
       { "name": "酒", "amount": "小さじ1" }
9. **調味料・常備品の分量表現:** 一般的な調味料や常備品については、以下の表現を優先的に使用してください：
   「大さじ」「小さじ」「少々」「適量」「少量」「たっぷり」「ひとつまみ」
10. **食材名の汎用化 (重要):** 食材名（name）には「薄切り」「みじん切り」といった切り方や状態の情報を含めず、汎用的な名称（例：×「豚肉（薄切り）」→ ○「豚肉」）にしてください。

出力は必ず指定されたJSONスキーマに従ってください。`;

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
    INSTRUCTIONS,
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
