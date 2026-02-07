/**
 * FaveFit - AI Configuration
 * Vercel AI SDK with Google Gemini provider
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Google Generative AI プロバイダーの初期化
 */
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/**
 * Gemini Flash モデル（高速、コスト効率良好）
 */
export const geminiFlash = google("gemini-flash-latest");

/**
 * Gemini 2.5 Flash モデル（2026年時点の最新高速モデル）
 */
export const gemini25Flash = google("gemini-2.5-flash");

/**
 * Gemini Pro モデル（高品質、複雑なタスク向け）
 */
export const geminiPro = google("gemini-pro-latest");
