/**
 * FaveFit - Preference Learner Agent (Mastra形式)
 * ユーザー嗜好学習エージェント
 */

import { Agent } from "@mastra/core/agent";
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
export const preferenceLearnerAgent = new Agent({
  id: "preference_learner",
  name: "Preference Learner",
  instructions: `
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
  model: "google/gemini-flash-latest",
});
