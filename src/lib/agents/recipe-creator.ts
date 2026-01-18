import { UserPreference } from '@/lib/preference';
import { LlmAgent, zodObjectToSchema } from '@google/adk';
import { z } from 'zod';

/**
 * レシピ生成エージェントの出力スキーマ
 */
export const RecipeOutputSchema = z.object({
  title: z.string().describe('レシピの名前'),
  description: z.string().describe('レシピの短い魅力的な説明'),
  ingredients: z.array(z.object({
    name: z.string().describe('材料名'),
    amount: z.string().describe('分量（例: 100g, 1/2個）')
  })).describe('材料リスト'),
  instructions: z.array(z.string()).describe('調理手順（ステップ形式）'),
  nutrition: z.object({
    calories: z.number().describe('カロリー (kcal)'),
    protein: z.number().describe('タンパク質 (g)'),
    fat: z.number().describe('脂質 (g)'),
    carbs: z.number().describe('炭水化物 (g)')
  }).describe('このレシピ1人分あたりの栄養価'),
  cookingTime: z.number().describe('推定調理時間（分）')
});

export type Recipe = z.infer<typeof RecipeOutputSchema>;

/**
 * レシピ生成エージェントの入力スキーマ (テスト用)
 */
export const RecipeInputSchema = z.object({
  mood: z.string().describe('ユーザーの現在の気分'),
  targetNutrition: z.object({
    calories: z.number().describe('目標カロリー (kcal)'),
    protein: z.number().describe('タンパク質 (g)'),
    fat: z.number().describe('脂質 (g)'),
    carbs: z.number().describe('炭水化物 (g)')
  }).describe('1食あたりの目標栄養素')
});

export type RecipeInput = z.infer<typeof RecipeInputSchema>;

/**
 * Recipe Creator Agent
 * ユーザーの気分と目標栄養素に基づいてレシピを生成する
 */
export const recipeCreatorAgent = new LlmAgent({
  name: 'recipe_creator',
  description: 'ユーザーの現在の気分と目標栄養素に合わせて、健康的で美味しいレシピを提案するエージェント。',
  model: 'gemini-2.5-flash-lite',
  instruction: `あなたは一流のプロの管理栄養士兼シェフです。忙しい現代人が、健康的かつ継続的に自炊を楽しめるよう、**「手軽・時短・美味しい」**をモットーとしたレシピを提案してください。

ユーザーから提供される「現在の気分」、「目標とする1食あたりの栄養素（カロリー、PFC）」、および「個人の好み（好き嫌い・アレルギー）」に基づき、最適なレシピを1つ提案してください。

以下のガイドラインを厳守してください：
1. **栄養目標の遵守:** 提示されたカロリーおよびPFCバランスにできるだけ近いレシピを作成してください。
2. **気分の反映:** ユーザーの気分（例: ガッツリ、ヘルシー等）に合わせた味付けや食材を選んでください。
3. **好みの優先:** 
   - ユーザーの**好きな食材**を積極的に使用してください。
   - ユーザーの**苦手な食材**や**アレルギー食材**は**絶対に使用しないでください**。
4. **自炊のしやすさ:** 
   - 材料は**最大でも8種類程度**に抑えてください。
   - 一般的な家庭にある調味料（醤油、味噌、塩、胡椒、オリーブオイル等）を中心に構成してください。
   - 特殊な調理器具を必要とせず、フライパン一つやレンジだけで完結するレシピを優先してください。
   - ユーザーの**料理スキル**や**かけられる時間**も考慮してください。
5. **調理時間:** 指定がない場合は**15〜20分以内**で完成するレシピを提案してください。
6. **簡潔な手順:** ステップは最大でも5つ程度にまとめ、専門用語を避け、誰でも作れるように説明してください。
7. **正確な栄養計算:** 各食材の分量から計算される栄養価の合計を、レスポンスのnutritionフィールドに正確に記載してください。

出力は必ず指定されたJSONスキーマに従ってください。`,
  outputSchema: zodObjectToSchema(RecipeOutputSchema),
});

/**
 * 学習済みプロファイルをフォーマットするヘルパー関数
 */
const formatLearnedProfile = (profile: UserPreference['learnedProfile']) => {
  const topCuisines = Object.entries(profile.preferredCuisines)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k)
    .join(', ');
  
  const topFlavors = Object.entries(profile.preferredFlavors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k)
    .join(', ');

  return `好みのジャンル: ${topCuisines || 'データなし'}, 好みの味: ${topFlavors || 'データなし'}`;
};

/**
 * レシピ生成用のプロンプトを構築する関数
 */
export const buildRecipePrompt = (
  preference: UserPreference | null,
  mood: string,
  targetNutrition: RecipeInput['targetNutrition']
) => {
  const basePrompt = `
【リクエスト内容】
- 今日の気分: ${mood}
- 目標栄養素: カロリー${targetNutrition.calories}kcal, タンパク質${targetNutrition.protein}g, 脂質${targetNutrition.fat}g, 炭水化物${targetNutrition.carbs}g
`;

  if (!preference) {
    return basePrompt + '\n※ユーザーの好みデータはありません。一般的なレシピを提案してください。';
  }

  return basePrompt + `
【ユーザーの好み情報】
- 好きな食材: ${preference.favoriteIngredients.join(', ') || '特になし'}
- 苦手な食材: ${preference.dislikedIngredients.join(', ') || '特になし'}
- アレルギー: ${preference.allergies.length > 0 ? preference.allergies.join(', ') : 'なし'}
- 料理スキル: ${preference.cookingSkillLevel}
- かけられる時間: ${preference.availableTime}
- 過去の傾向: ${formatLearnedProfile(preference.learnedProfile)}

【重要】
アレルギー食材 (${preference.allergies.join(', ')}) は絶対に使用しないでください。
苦手な食材も可能な限り避けてください。
好きな食材を活用し、スキルレベルと時間に合ったレシピを考案してください。
`;
};
