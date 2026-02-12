/**
 * FaveFit - AI Configuration
 * Google Gen AI SDK
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Google Generative AI クライアントの初期化
 */
const apiKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || "dummy-key-for-build";
export const genAI = new GoogleGenAI({
  apiKey: apiKey,
});

/**
 * モデルID定義
 */
export const GEMINI_2_5_FLASH_MODEL = "gemini-2.5-flash";
export const GEMINI_3_PRO_MODEL = "gemini-3-pro-preview";
export const GEMINI_3_FLASH_MODEL = "gemini-3-flash-preview";
