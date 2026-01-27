/**
 * FaveFit - Recipe Creator Agent (Mastra形式)
 * レシピ詳細生成エージェント
 */

import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { UserDocument } from "@/lib/db/firestore/userRepository";

/**
 * レシピ生成エージェントの出力スキーマ
 */
export const RecipeOutputSchema = z.object({
  title: z.string().describe("レシピの名前"),
  description: z.string().describe("レシピの短い魅力的な説明"),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe("材料名"),
        amount: z.string().describe("分量（例: 100g, 1/2個）"),
      })
    )
    .describe("材料リスト"),
  instructions: z.array(z.string()).describe("調理手順（ステップ形式）"),
  nutrition: z
    .object({
      calories: z.number().describe("カロリー (kcal)"),
      protein: z.number().describe("タンパク質 (g)"),
      fat: z.number().describe("脂質 (g)"),
      carbs: z.number().describe("炭水化物 (g)"),
    })
    .describe("このレシピ1人分あたりの栄養価"),
  cookingTime: z.number().describe("推定調理時間（分）"),
});

export type Recipe = z.infer<typeof RecipeOutputSchema>;

/**
 * Recipe Creator Agent
 */
export const recipeCreatorAgent = new Agent({
  id: "recipe_creator",
  name: "Recipe Creator",
  instructions: `あなたは一流のプロの管理栄養士兼シェフです。忙しい現代人が、健康的かつ継続的に自炊を楽しめるよう、**「手軽・時短・美味しい」**をモットーとしたレシピを提案してください。

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

出力は必ず指定されたJSONスキーマに従ってください。`,
  model: "google/gemini-flash-latest",
});

/**
 * 学習済みプロファイルをフォーマットするヘルパー関数
 */
const formatLearnedProfile = (
  learnedPrefs: UserDocument["learnedPreferences"]
) => {
  const topCuisines = Object.entries(learnedPrefs.cuisines || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  const topFlavors = Object.entries(learnedPrefs.flavorProfile || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  return `好みのジャンル: ${topCuisines || "データなし"}, 好みの味: ${topFlavors || "データなし"}`;
};

/**
 * レシピ生成用のプロンプトを構築する関数
 */
export const buildRecipePrompt = (
  userDoc: UserDocument | null,
  mood: string,
  targetNutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }
) => {
  const basePrompt = `
【リクエスト内容】
- 今日の気分: ${mood}
- 目標栄養素: カロリー${targetNutrition.calories}kcal, タンパク質${targetNutrition.protein}g, 脂質${targetNutrition.fat}g, 炭水化物${targetNutrition.carbs}g
`;

  if (!userDoc) {
    return (
      basePrompt +
      "\n※ユーザーの好みデータはありません。一般的なレシピを提案してください。"
    );
  }

  const { profile, learnedPreferences } = userDoc;

  return (
    basePrompt +
    `
【ユーザーの好み情報】
- 好きな食材: ${(profile.favoriteIngredients || []).join(", ") || "特になし"}
- 苦手な食材: ${(learnedPreferences.dislikedIngredients || []).join(", ") || "特になし"}
- アレルギー: ${(profile.allergies || []).length > 0 ? profile.allergies!.join(", ") : "なし"}
- 料理スキル: ${profile.cookingSkillLevel || "intermediate"}
- かけられる時間: ${profile.availableTime || "medium"}
- 過去の傾向: ${formatLearnedProfile(learnedPreferences)}

【重要】
1. **リクエストの最優先:** 「今日の気分」に具体的な料理名や食材（例: エスカルゴ、ステーキ等）が含まれる場合、入手難易度や調理時間を問わず、**必ずその食材を使用したレシピ**を提案してください。
2. **安全性の確保:** アレルギー食材 (${(profile.allergies || []).join(", ")}) は絶対に使用しないでください。
3. **好みの反映:** 苦手な食材も可能な限り避けてください。好きな食材を積極的に活用し、ユーザーのスキルレベルと時間に合ったレシピを考案してください。
`
  );
};
