/**
 * FaveFit - AI Configuration
 * Vercel AI SDK Integration
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * AI SDK Providers
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "dummy-key-for-build",
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
});

/**
 * Model Roles Configuration
 * 切り替えを容易にするため、役割ごとの定数を定義
 */
const GPT_5_MINI = openai("gpt-5-mini");
const GPT_5 = openai("gpt-5");

/**
 * 機能ごとのモデル割り当て設定
 * 各機能がどのモデルを使用するかを一元管理
 */
export const AI_CONFIG = {
  agents: {
    planGenerator: GPT_5,
  },
  functions: {
    planSkeleton: GPT_5, // 整合性重視
    chunkDetail: GPT_5, // 栄養計算の精度重視
    planAuditor: GPT_5, // ユーザー意図の解釈重視

    recipeGenerator: GPT_5_MINI, // 数が多いので高速モデル
    menuSuggester: GPT_5_MINI, // インタラクティブ性重視
    preferenceAnalyzer: GPT_5_MINI, // パターン認識なら高速モデルで十分
    dietEstimator: GPT_5_MINI, // 概算でよいため
    shoppingListNormalizer: GPT_5, // 単純な分類タスク
  },
} as const;
