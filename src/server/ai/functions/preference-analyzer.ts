/**
 * FaveFit - Preference Analyzer Function
 * ユーザー嗜好学習・分析関数
 */

import { z } from "zod";
import { callModelWithSchema } from "../utils/agent-helpers";

// ============================================
// スキーマ定義
// ============================================

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
    .array(
      z.object({
        category: z.string(),
        score: z.number(),
      })
    )
    .describe(
      "ジャンルごとのスコア変動 (例: [{ category: 'japanese', score: 5 }])"
    ),
  flavorUpdates: z
    .array(
      z.object({
        flavor: z.string(),
        score: z.number(),
      })
    )
    .describe("味付けごとのスコア変動 (例: [{ flavor: 'spicy', score: 3 }])"),
  summary: z.string().describe("学習内容の要約"),
});

// ============================================
// 型エクスポート
// ============================================

export type PreferenceLearnerInput = z.infer<
  typeof PreferenceLearnerInputSchema
>;
export type PreferenceLearnerOutput = z.infer<
  typeof PreferenceLearnerOutputSchema
>;

// 後方互換性のためのエイリアス
export type PreferenceAnalysis = PreferenceLearnerOutput;

// ============================================
// プロンプト
// ============================================

import { PREFERENCE_LEARNER_INSTRUCTIONS } from "../prompts/functions/preference-analyzer";
import { FAST_MODEL } from "../config";

// ============================================
// 関数実行
// ============================================

/**
 * Preference Analysis を実行
 */
export async function analyzePreferenceData(
  prompt: string
): Promise<PreferenceLearnerOutput> {
  return callModelWithSchema(
    PREFERENCE_LEARNER_INSTRUCTIONS,
    prompt,
    PreferenceLearnerOutputSchema,
    FAST_MODEL
  );
}
