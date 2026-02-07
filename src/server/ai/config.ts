/**
 * FaveFit - AI Configuration
 * Google Gen AI SDK
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Google Generative AI クライアントの初期化
 */
export const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/**
 * モデルID定義
 */
export const GEMINI_FLASH_MODEL = "gemini-1.5-flash";
export const GEMINI_PRO_MODEL = "gemini-1.5-pro";
// ユーザー指定のモデル名（存在確認が必要だが、一旦維持）
export const GEMINI_25_FLASH_MODEL = "gemini-2.5-flash";