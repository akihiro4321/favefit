/**
 * FaveFit - AI Configuration
 * Vercel AI SDK Integration
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * AI SDK Providers
 */
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "dummy-key-for-build",
});

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
});

/**
 * Model Roles Configuration
 * 切り替えを容易にするため、役割ごとの定数を定義
 */

// 高速・安価なモデル (Gemini 1.5 Flash / GPT-4o mini)
// 現在は GPT-4o mini を採用
export const FAST_MODEL = openai("gpt-4o-mini");

// 高性能なモデル (Gemini 1.5 Pro / GPT-4o)
// 現在は GPT-4o を採用
export const SMART_MODEL = openai("gpt-4o");

// 互換性のためのエイリアス（移行期間中のみ使用し、徐々に廃止する）
// 旧: GEMINI_3_FLASH_MODEL など
export const LEGACY_GEMINI_FLASH_MODEL = FAST_MODEL;
export const LEGACY_GEMINI_PRO_MODEL = SMART_MODEL;
