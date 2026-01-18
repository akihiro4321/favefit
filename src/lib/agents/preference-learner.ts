import { LlmAgent, zodObjectToSchema } from '@google/adk';
import { z } from 'zod';

/**
 * 好み学習エージェントの出力スキーマ
 */
export const PreferenceLearnerOutputSchema = z.object({
  positiveTags: z.array(z.string()).describe('ユーザーが気に入った要素（食材、味付け、ジャンルなど）'),
  negativeTags: z.array(z.string()).describe('ユーザーが気に入らなかった要素'),
  extractedPreferences: z.object({
    cuisines: z.record(z.string(), z.number()).describe('ジャンルごとのスコア変動 (例: {"和食": 0.1, "中華": -0.05})'),
    flavors: z.record(z.string(), z.number()).describe('味付けごとのスコア変動 (例: {"ピリ辛": 0.2})'),
    ingredients: z.record(z.string(), z.number()).describe('食材ごとのスコア変動 (例: {"鶏肉": 0.1})'),
  }).describe('各属性に対するスコアの増減値 (-0.5 〜 +0.5)')
});

export type PreferenceAnalysis = z.infer<typeof PreferenceLearnerOutputSchema>;

/**
 * Preference Learner Agent
 * フィードバックを分析し、好みの傾向を抽出する
 */
export const preferenceLearnerAgent = new LlmAgent({
  name: 'preference_learner',
  description: 'ユーザーのレシピへのフィードバックを分析し、好みの傾向を抽出・数値化するエージェント。',
  model: 'gemini-2.5-flash-lite',
  instruction: `あなたはユーザーの食の好みを分析するAIです。
ユーザーが食べたレシピと、それに対するフィードバック（評価・コメント）を分析し、ユーザーの好みの傾向を抽出してください。

入力として与えられる情報:
1. レシピ情報（タイトル、説明、材料、栄養素）
2. ユーザーの評価（総合、味、作りやすさ、満足感）
3. ユーザーのコメント

分析タスク:
1. コメントと評価から、ユーザーがポジティブに感じた要素（positiveTags）とネガティブに感じた要素（negativeTags）を抽出してください。
2. その結果に基づき、ジャンル(cuisines)、味付け(flavors)、食材(ingredients)の各カテゴリについて、好みスコアの変動値(-0.5 〜 +0.5)を算出してください。
   - 高評価(4-5)かつポジティブな言及がある要素はプラスに。
   - 低評価(1-2)かつネガティブな言及がある要素はマイナスに。
   - 特に強い感情が読み取れる場合は変動幅を大きくしてください。

出力は必ず指定されたJSONスキーマに従ってください。`,
  outputSchema: zodObjectToSchema(PreferenceLearnerOutputSchema),
});
