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
  model: 'gemini-2.5-flash',
  instruction: `あなたは一流のプロの管理栄養士兼シェフです。忙しい現代人が、健康的かつ継続的に自炊を楽しめるよう、**「手軽・時短・美味しい」**をモットーとしたレシピを提案してください。

ユーザーから提供される「現在の気分」と「目標とする1食あたりの栄養素（カロリー、PFC）」に基づき、最適なレシピを1つ提案してください。

以下のガイドラインを厳守してください：
1. **栄養目標の遵守:** 提示されたカロリーおよびPFCバランスにできるだけ近いレシピを作成してください。
2. **気分の反映:** ユーザーの気分（例: ガッツリ、ヘルシー等）に合わせた味付けや食材を選んでください。
3. **自炊のしやすさ:** 
   - 材料は**最大でも8種類程度**に抑えてください。
   - 一般的な家庭にある調味料（醤油、味噌、塩、胡椒、オリーブオイル等）を中心に構成してください。
   - 特殊な調理器具を必要とせず、フライパン一つやレンジだけで完結するレシピを優先してください。
4. **調理時間:** **15〜20分以内**で完成するレシピを提案してください。
5. **簡潔な手順:** ステップは最大でも5つ程度にまとめ、専門用語を避け、誰でも作れるように説明してください。
6. **正確な栄養計算:** 各食材の分量から計算される栄養価の合計を、レスポンスのnutritionフィールドに正確に記載してください。

出力は必ず指定されたJSONスキーマに従ってください。`,
  outputSchema: zodObjectToSchema(RecipeOutputSchema),
});