/**
 * FaveFit - Boredom Analyzer Agent (Mastra形式)
 * 飽き防止分析エージェント
 */

import { Agent } from "@mastra/core/agent";
import { z } from "zod";

/**
 * 入力スキーマ
 */
export const BoredomAnalyzerInputSchema = z.object({
  recentMeals: z
    .array(
      z.object({
        date: z.string(),
        mealType: z.enum(["breakfast", "lunch", "dinner"]),
        title: z.string(),
        tags: z.array(z.string()),
      })
    )
    .describe("直近14日間の食事履歴"),
  preferences: z
    .object({
      cuisines: z.record(z.number()).optional(),
      flavorProfile: z.record(z.number()).optional(),
    })
    .optional()
    .describe("ユーザーの嗜好プロファイル"),
});

/**
 * 出力スキーマ
 */
export const BoredomAnalyzerOutputSchema = z.object({
  boredomScore: z.number().min(0).max(100).describe("飽き率スコア (0-100)"),
  analysis: z.string().describe("分析結果の説明"),
  recommendations: z
    .array(
      z.object({
        type: z.enum(["cuisine", "flavor", "ingredient"]),
        suggestion: z.string(),
        reason: z.string(),
      })
    )
    .describe("改善提案"),
  shouldRefresh: z.boolean().describe("プラン更新を推奨するか"),
  refreshDates: z
    .array(z.string())
    .optional()
    .describe("更新推奨日（YYYY-MM-DD形式）"),
});

export type BoredomAnalyzerInput = z.infer<typeof BoredomAnalyzerInputSchema>;
export type BoredomAnalyzerOutput = z.infer<typeof BoredomAnalyzerOutputSchema>;

/**
 * Boredom Analyzer Agent
 */
export const boredomAnalyzerAgent = new Agent({
  id: "boredom_analyzer",
  name: "Boredom Analyzer",
  instructions: `
あなたは「食事の飽き」を分析する専門家です。
ユーザーの直近の食事履歴を分析し、飽き率スコアと改善提案を提供してください。

【飽きの判定基準】
1. 同じ料理の繰り返し（3日以内に同一メニュー）
2. 同じジャンルの連続（和食ばかり、中華ばかり等）
3. 味付けの偏り（辛いものばかり、あっさりばかり等）
4. 食材の偏り（鶏肉ばかり等）

【飽き率スコア】
- 0-30: 変化に富んでいる（リフレッシュ不要）
- 31-60: やや偏りあり（注意が必要）
- 61-100: 飽きリスク高（リフレッシュ推奨）

【出力フォーマット】
JSON形式で以下のフィールドを含めてください:
- boredomScore: number (0-100)
- analysis: string (分析結果の説明)
- recommendations: array of { type, suggestion, reason }
- shouldRefresh: boolean
- refreshDates: array of string (更新推奨日)

【recommendations.type の値】
- "cuisine": 料理ジャンルの変更提案
- "flavor": 味付けの変更提案
- "ingredient": 食材の変更提案
`,
  model: "google/gemini-flash-latest",
});
