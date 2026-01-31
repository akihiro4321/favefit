/**
 * FaveFit - Boredom Analyzer Agent
 * 飽き防止分析エージェント
 */

import { z } from "zod";
import { runAgentWithSchema } from "../utils/agent-helpers";
import { MealTypeSchema, PreferencesProfileSchema } from "../types/common";

// ============================================
// スキーマ定義
// ============================================

/**
 * 食事履歴アイテムスキーマ
 */
const MealHistoryItemSchema = z.object({
  date: z.string(),
  mealType: MealTypeSchema,
  title: z.string(),
  tags: z.array(z.string()),
});

/**
 * 入力スキーマ
 */
export const BoredomAnalyzerInputSchema = z.object({
  recentMeals: z
    .array(MealHistoryItemSchema)
    .describe("直近の食事履歴"),
  preferences: PreferencesProfileSchema.optional().describe(
    "ユーザーの嗜好プロファイル"
  ),
});

/**
 * 改善提案スキーマ
 */
const RecommendationSchema = z.object({
  type: z.enum(["cuisine", "flavor", "ingredient"]),
  suggestion: z.string(),
  reason: z.string(),
});

/**
 * 出力スキーマ（フル分析）
 */
export const BoredomAnalyzerOutputSchema = z.object({
  boredomScore: z.number().min(0).max(100).describe("飽き率スコア (0-100)"),
  analysis: z.string().describe("分析結果の説明"),
  recommendations: z.array(RecommendationSchema).describe("改善提案"),
  shouldRefresh: z.boolean().describe("プラン更新を推奨するか"),
  refreshDates: z
    .array(z.string())
    .optional()
    .describe("更新推奨日（YYYY-MM-DD形式）"),
});

/**
 * 簡易分析用スキーマ（リフレッシュ判定用）
 */
export const SimpleBoredomAnalysisSchema = z.object({
  boredomScore: z.number(),
  shouldRefresh: z.boolean(),
  refreshDates: z.array(z.string()).optional(),
  analysis: z.string().optional(),
});

/**
 * 探索プロファイル分析用スキーマ
 */
export const ExplorationProfileSchema = z.object({
  explorationProfile: z.any(),
  message: z.string().optional(),
});

// ============================================
// 型エクスポート
// ============================================

export type BoredomAnalyzerInput = z.infer<typeof BoredomAnalyzerInputSchema>;
export type BoredomAnalyzerOutput = z.infer<typeof BoredomAnalyzerOutputSchema>;
export type SimpleBoredomAnalysis = z.infer<typeof SimpleBoredomAnalysisSchema>;
export type ExplorationProfile = z.infer<typeof ExplorationProfileSchema>;

// ============================================
// プロンプト
// ============================================

const INSTRUCTIONS = `
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

【recommendations.type の値】
- "cuisine": 料理ジャンルの変更提案
- "flavor": 味付けの変更提案
- "ingredient": 食材の変更提案
`;

// ============================================
// エージェント実行
// ============================================

/**
 * Boredom Analyzer を実行（フル分析）
 */
export async function runBoredomAnalyzer(
  prompt: string,
  userId?: string
): Promise<BoredomAnalyzerOutput> {
  return runAgentWithSchema(
    INSTRUCTIONS,
    prompt,
    BoredomAnalyzerOutputSchema,
    "flash",
    "boredom-analyzer",
    userId
  );
}

/**
 * 簡易分析を実行（リフレッシュ判定用）
 */
export async function runSimpleBoredomAnalysis(
  prompt: string,
  userId?: string
): Promise<SimpleBoredomAnalysis> {
  return runAgentWithSchema(
    INSTRUCTIONS,
    prompt,
    SimpleBoredomAnalysisSchema,
    "flash",
    "simple-boredom-analysis",
    userId
  );
}

/**
 * 探索プロファイル分析を実行
 */
export async function runExplorationAnalysis(
  prompt: string,
  userId?: string
): Promise<ExplorationProfile> {
  return runAgentWithSchema(
    INSTRUCTIONS,
    prompt,
    ExplorationProfileSchema,
    "flash",
    "exploration-analysis",
    userId
  );
}
