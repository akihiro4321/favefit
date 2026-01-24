/**
 * FaveFit v2 - Preference Learner Agent
 * ユーザー嗜好学習 + 飽き防止ロジック対応
 */

import { LlmAgent, zodObjectToSchema } from "@google/adk";
import { z } from "zod";

/**
 * 入力スキーマ（フィードバック分析用）
 */
export const PreferenceLearnerInputSchema = z.object({
  recipe: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    ingredients: z.array(z.string()),
  }),
  feedback: z.object({
    wantToMakeAgain: z.boolean(),
    comment: z.string().optional(),
  }),
  currentPreferences: z
    .object({
      cuisines: z.record(z.number()).optional(),
      flavorProfile: z.record(z.number()).optional(),
    })
    .optional(),
});

/**
 * 出力スキーマ（嗜好更新）
 */
export const PreferenceLearnerOutputSchema = z.object({
  cuisineUpdates: z
    .any()
    .describe("ジャンルごとのスコア変動 (例: { japanese: 5, korean: -2 })"),
  flavorUpdates: z
    .any()
    .describe("味付けごとのスコア変動 (例: { spicy: 3, light: 1 })"),
  summary: z.string().describe("学習内容の要約"),
});

export type PreferenceLearnerInput = z.infer<typeof PreferenceLearnerInputSchema>;
export type PreferenceLearnerOutput = z.infer<typeof PreferenceLearnerOutputSchema>;

// 後方互換性のためのエイリアス
export type PreferenceAnalysis = PreferenceLearnerOutput;

/**
 * Preference Learner Agent
 */
export const preferenceLearnerAgent = new LlmAgent({
  name: "preference_learner",
  model: "gemini-2.5-flash-lite",
  description: "ユーザーのフィードバックから嗜好を学習するエージェント。",
  instruction: `
あなたはユーザーの食の好みを分析するAIです。

【入力】
- recipe: ユーザーが食べたレシピ情報
- feedback: wantToMakeAgain (また作りたいか) と comment

【タスク】
1. レシピのタグと材料から、ジャンル(cuisines)と味付け(flavorProfile)を特定
2. wantToMakeAgain が true なら該当する項目にプラススコア (+5~+10)
3. wantToMakeAgain が false なら該当する項目にマイナススコア (-3~-5)
4. comment があれば、その内容を考慮してスコアを調整

【出力形式】
JSON形式で出力してください。cuisineUpdates と flavorUpdates はキー(文字列)と値(数値)のオブジェクトにしてください。
`,
  outputSchema: zodObjectToSchema(PreferenceLearnerOutputSchema),
  outputKey: "preference_update",
});

// ========================================
// 飽き防止分析用
// ========================================

/**
 * 入力スキーマ（飽き防止分析用）
 */
export const BoredomAnalysisInputSchema = z.object({
  goodRecipes: z.array(z.string()).describe("good と選ばれたレシピタイトル"),
  badRecipes: z.array(z.string()).describe("bad と選ばれたレシピタイトル"),
  currentPreferences: z.object({
    cuisines: z.record(z.number()),
    flavorProfile: z.record(z.number()),
  }),
});

/**
 * 出力スキーマ（飽き防止分析）
 */
export const BoredomAnalysisOutputSchema = z.object({
  explorationProfile: z
    .object({
      prioritizeCuisines: z.array(z.string()),
      prioritizeFlavors: z.array(z.string()),
      avoidCuisines: z.array(z.string()),
    })
    .describe("探索優先プロファイル"),
  message: z.string().describe("ユーザーへのメッセージ"),
});

export type BoredomAnalysisInput = z.infer<typeof BoredomAnalysisInputSchema>;
export type BoredomAnalysisOutput = z.infer<typeof BoredomAnalysisOutputSchema>;

/**
 * Boredom Analyzer Agent（飽き防止用）
 */
export const boredomAnalyzerAgent = new LlmAgent({
  name: "boredom_analyzer",
  model: "gemini-2.5-flash-lite",
  description: "ユーザーの飽き状態を分析し、新しい方向性を提案するエージェント。",
  instruction: `
あなたはユーザーの「食の飽き」を解消するスペシャリストです。

【入力】
- 5つのレシピに対する good/bad の選択結果
- 現在の嗜好プロファイル

【タスク】
1. good/bad の傾向を分析
2. 現在のプロファイルで高スコアのジャンルを「避けるべき」に追加
3. 低スコアまたは未体験のジャンルを「優先する」に追加
4. ユーザーを励ますメッセージを作成

【出力例】
{
  "explorationProfile": {
    "prioritizeCuisines": ["italian", "thai"],
    "prioritizeFlavors": ["spicy", "creamy"],
    "avoidCuisines": ["japanese"]
  },
  "message": "いつもの和食から離れて、イタリアンやタイ料理に挑戦してみましょう！新しい発見があるかもしれません。"
}
`,
  outputSchema: zodObjectToSchema(BoredomAnalysisOutputSchema),
  outputKey: "boredom_analysis",
});
