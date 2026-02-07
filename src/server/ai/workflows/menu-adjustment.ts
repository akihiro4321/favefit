/**
 * FaveFit - Menu Adjustment Workflow
 *
 * メニュー調整ワークフロー
 * MenuAdjusterエージェントをワークフローでラップし、
 * 入力バリデーションとメタデータ生成を提供
 */

import {
  generateMenuSuggestions,
  type MenuAdjusterInput,
  type MenuAdjusterOutput,
} from "../functions/menu-suggester";
import { getMenuAdjustmentPrompt } from "../prompts/functions/menu-suggester";
import type { NutritionValues, PreferencesProfile } from "../types/common";

// ============================================
// 型定義
// ============================================

/**
 * ワークフロー入力
 */
export interface MenuAdjustmentWorkflowInput {
  userId: string;
  availableIngredients: string[];
  targetNutrition: NutritionValues;
  userComment?: string;
  previousSuggestions?: string[];
  preferences?: PreferencesProfile;
}

/**
 * ワークフロー結果
 */
export interface MenuAdjustmentWorkflowResult {
  suggestions: MenuAdjusterOutput["suggestions"];
  message: string;
  adjustmentMetadata: {
    totalSuggestions: number;
    hasAdditionalIngredients: boolean;
  };
}

// ============================================
// 内部ステップ関数
// ============================================

/**
 * Step 1: 入力データの検証
 * 必須フィールドの存在と妥当性をチェック
 */
function validateMenuAdjustmentInput(input: MenuAdjustmentWorkflowInput): {
  isValid: boolean;
  reason?: string;
} {
  if (!input.availableIngredients || input.availableIngredients.length === 0) {
    return {
      isValid: false,
      reason: "Available ingredients are required",
    };
  }

  if (!input.targetNutrition || input.targetNutrition.calories <= 0) {
    return {
      isValid: false,
      reason: "Valid target nutrition is required",
    };
  }

  return { isValid: true };
}

/**
 * Step 2: プロンプト構築
 * 既存のgetMenuAdjustmentPrompt関数を呼び出し
 */
async function buildMenuAdjustmentPromptInternal(
  input: MenuAdjustmentWorkflowInput,
): Promise<string> {
  const menuAdjusterInput: MenuAdjusterInput = {
    availableIngredients: input.availableIngredients,
    targetNutrition: input.targetNutrition,
    userComment: input.userComment,
    previousSuggestions: input.previousSuggestions,
    preferences: input.preferences,
  };

  return getMenuAdjustmentPrompt(menuAdjusterInput);
}

/**
 * Step 3: エージェント実行
 * MenuAdjusterエージェントを実行
 */
async function executeMenuAdjustment(
  prompt: string,
): Promise<MenuAdjusterOutput> {
  return generateMenuSuggestions(prompt);
}

/**
 * Step 4: 結果のポストプロセス
 * メタデータを生成してユーザーに有用な情報を提供
 */
function processMenuSuggestions(
  rawOutput: MenuAdjusterOutput,
): MenuAdjustmentWorkflowResult {
  const suggestions = rawOutput.suggestions || [];

  const hasAdditionalIngredients = suggestions.some(
    (s) => s.additionalIngredients && s.additionalIngredients.length > 0,
  );

  return {
    suggestions,
    message: rawOutput.message || "メニューを提案しました！",
    adjustmentMetadata: {
      totalSuggestions: suggestions.length,
      hasAdditionalIngredients,
    },
  };
}

// ============================================
// メインワークフロー
// ============================================

/**
 * メニュー調整ワークフロー
 *
 * 4ステップフロー:
 * 1. validateMenuAdjustmentInput - 入力データ検証
 * 2. buildMenuAdjustmentPromptInternal - プロンプト構築
 * 3. executeMenuAdjustment - エージェント実行
 * 4. processMenuSuggestions - 結果のポストプロセス
 */
export async function adjustMenu(
  input: MenuAdjustmentWorkflowInput,
): Promise<MenuAdjustmentWorkflowResult> {
  console.log("[MenuAdjustmentWorkflow] Step 1: Validating input...");
  const validation = validateMenuAdjustmentInput(input);

  if (!validation.isValid) {
    throw new Error(`Invalid input: ${validation.reason}`);
  }

  console.log("[MenuAdjustmentWorkflow] Step 2: Building prompt...");
  const prompt = await buildMenuAdjustmentPromptInternal(input);

  console.log("[MenuAdjustmentWorkflow] Step 3: Executing agent...");
  const rawOutput = await executeMenuAdjustment(prompt);

  console.log("[MenuAdjustmentWorkflow] Step 4: Processing suggestions...");
  const result = processMenuSuggestions(rawOutput);

  console.log(
    `[MenuAdjustmentWorkflow] Generated ${result.adjustmentMetadata.totalSuggestions} suggestions ` +
      `(additional ingredients needed: ${result.adjustmentMetadata.hasAdditionalIngredients})`,
  );

  return result;
}
