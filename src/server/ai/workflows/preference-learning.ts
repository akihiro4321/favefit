/**
 * FaveFit - Preference Learning Workflow
 *
 * 嗜好学習ワークフロー
 * PreferenceLearnerエージェントをワークフローでラップし、
 * 学習結果の統計情報を提供
 */

import {
  runPreferenceLearner,
  type PreferenceLearnerOutput,
} from "../agents/preference-learner";
import { getPreferenceLearningPrompt } from "../agents/prompts/preference-learner";

// ============================================
// 型定義
// ============================================

/**
 * ワークフロー入力
 */
export interface PreferenceLearningWorkflowInput {
  userId: string;
  recipe: {
    title: string;
    tags: string[];
    ingredients: string[];  // 食材名のみの配列
  };
  feedback: {
    wantToMakeAgain: boolean;
    comment?: string;
  };
  currentPreferences?: {
    cuisines?: Record<string, number>;
    flavorProfile?: Record<string, number>;
  };
}

/**
 * ワークフロー結果
 */
export interface PreferenceLearningWorkflowResult {
  analysis: PreferenceLearnerOutput;
  updatedScores: {
    totalCuisineChanges: number;
    totalFlavorChanges: number;
  };
}

// ============================================
// 内部ステップ関数
// ============================================

/**
 * Step 1: プロンプト構築
 * 既存のgetPreferenceLearningPrompt関数を呼び出し
 */
async function buildPreferenceLearningPromptInternal(
  input: PreferenceLearningWorkflowInput
): Promise<string> {
  return getPreferenceLearningPrompt({
    recipe: input.recipe,
    feedback: input.feedback,
  });
}

/**
 * Step 2: エージェント実行
 * PreferenceLearnerエージェントを実行
 */
async function executePreferenceLearning(
  prompt: string
): Promise<PreferenceLearnerOutput> {
  return runPreferenceLearner(prompt);
}

/**
 * Step 3: 分析結果の統計情報を計算
 * スコア変更の合計値を算出
 */
function calculateScoreChanges(
  analysis: PreferenceLearnerOutput
): { totalCuisineChanges: number; totalFlavorChanges: number } {
  const cuisineTotal = Object.values(analysis.cuisineUpdates).reduce(
    (sum, val) => sum + Math.abs(val),
    0
  );
  const flavorTotal = Object.values(analysis.flavorUpdates).reduce(
    (sum, val) => sum + Math.abs(val),
    0
  );

  return {
    totalCuisineChanges: cuisineTotal,
    totalFlavorChanges: flavorTotal,
  };
}

// ============================================
// メインワークフロー
// ============================================

/**
 * 嗜好学習ワークフロー
 *
 * シンプルな3ステップフロー:
 * 1. buildPreferenceLearningPromptInternal - プロンプト構築
 * 2. executePreferenceLearning - エージェント実行
 * 3. calculateScoreChanges - 統計情報計算
 */
export async function learnPreferences(
  input: PreferenceLearningWorkflowInput
): Promise<PreferenceLearningWorkflowResult> {
  console.log("[PreferenceLearningWorkflow] Step 1: Building prompt...");
  const prompt = await buildPreferenceLearningPromptInternal(input);

  console.log("[PreferenceLearningWorkflow] Step 2: Executing agent...");
  const analysis = await executePreferenceLearning(prompt);

  console.log("[PreferenceLearningWorkflow] Step 3: Calculating score changes...");
  const updatedScores = calculateScoreChanges(analysis);

  console.log(
    `[PreferenceLearningWorkflow] Updated ${updatedScores.totalCuisineChanges} cuisine scores, ` +
      `${updatedScores.totalFlavorChanges} flavor scores`
  );

  return {
    analysis,
    updatedScores,
  };
}
