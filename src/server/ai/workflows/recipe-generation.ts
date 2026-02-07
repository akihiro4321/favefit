/**
 * FaveFit - Recipe Generation Workflow
 *
 * レシピ生成ワークフロー
 * RecipeCreatorエージェントをワークフローでラップし、
 * 将来的な拡張（バリデーション、リトライ）に備える
 */

import { generateRecipeData, type Recipe } from "../functions/recipe-generator";
import { buildRecipePrompt } from "../prompts/functions/recipe-generator";
import type { UserDocument } from "@/server/db/firestore/userRepository";

// ============================================
// 型定義
// ============================================

/**
 * ワークフロー入力
 */
export interface RecipeGenerationWorkflowInput {
  userId?: string;
  mood: string; // レシピタイトルまたは気分（「ハンバーグ」「ガッツリ」など）
  targetNutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  userDoc?: UserDocument | null; // オプショナル（ない場合はシンプル生成）
}

/**
 * ワークフロー結果
 */
export interface RecipeGenerationWorkflowResult {
  recipe: Recipe;
  executionTime?: number; // デバッグ用（ミリ秒）
}

// ============================================
// 内部ステップ関数
// ============================================

/**
 * Step 1: プロンプト構築
 * 既存のbuildRecipePrompt関数を呼び出し
 */
async function buildRecipeGenerationPrompt(
  input: RecipeGenerationWorkflowInput,
): Promise<string> {
  return buildRecipePrompt(
    input.userDoc || null,
    input.mood,
    input.targetNutrition,
  );
}

/**
 * Step 2: エージェント実行
 * RecipeCreatorエージェントを実行
 */
async function executeRecipeGeneration(prompt: string): Promise<Recipe> {
  return generateRecipeData(prompt);
}

/**
 * Step 3: バリデーション
 * レシピ出力の基本的な整合性をチェック
 */
function validateRecipeOutput(recipe: Recipe): boolean {
  return !!(
    recipe.title &&
    recipe.ingredients &&
    recipe.ingredients.length > 0 &&
    recipe.instructions &&
    recipe.instructions.length > 0 &&
    recipe.nutrition &&
    recipe.nutrition.calories > 0
  );
}

// ============================================
// メインワークフロー
// ============================================

/**
 * レシピ生成ワークフロー
 *
 * シンプルな3ステップフロー:
 * 1. buildRecipeGenerationPrompt - プロンプト構築
 * 2. executeRecipeGeneration - エージェント実行
 * 3. validateRecipeOutput - 基本バリデーション
 */
export async function generateRecipe(
  input: RecipeGenerationWorkflowInput,
): Promise<RecipeGenerationWorkflowResult> {
  const startTime = Date.now();

  console.log("[RecipeWorkflow] Step 1: Building prompt...");
  const prompt = await buildRecipeGenerationPrompt(input);

  console.log("[RecipeWorkflow] Step 2: Executing agent...");
  const recipe = await executeRecipeGeneration(prompt);

  console.log("[RecipeWorkflow] Step 3: Validating output...");
  const isValid = validateRecipeOutput(recipe);

  if (!isValid) {
    console.warn(
      "[RecipeWorkflow] Recipe validation failed, but returning result. " +
        "Future enhancement: add retry logic here.",
    );
    // 将来的にリトライ処理を追加する余地
  }

  const executionTime = Date.now() - startTime;
  console.log(`[RecipeWorkflow] Completed in ${executionTime}ms`);

  return {
    recipe,
    executionTime,
  };
}
