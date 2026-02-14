/**
 * FaveFit - AIエージェントヘルパー関数
 */

import { z } from "zod";
import { generateObject, LanguageModel } from "ai";
import { FAST_MODEL } from "../config";

// ============================================
// エージェント実行ヘルパー
// ============================================

/**
 * 複数のスキーマに対応するエージェント実行 (Vercel AI SDK)
 */
export async function callModelWithSchema<TSchema extends z.ZodType>(
  instructions: string,
  prompt: string,
  schema: TSchema,
  // 文字列IDではなくAI SDKのモデルオブジェクトを受け取るように変更
  // デフォルトは FAST_MODEL
  model: LanguageModel = FAST_MODEL
): Promise<z.infer<TSchema>> {
  try {
    const result = await generateObject({
      model: model,
      system: instructions,
      prompt: prompt,
      schema: schema,
      // 必要に応じてモードを指定 (auto, json, tool)
      // Gemini/OpenAIともに 'json' or 'auto' で構造化出力が可能
      mode: "json",
    });

    return result.object;
  } catch (error) {
    console.error("AI SDK Error:", error);
    throw error;
  }
}

// ============================================
// プロンプト構築ヘルパー
// ============================================

/**
 * 嗜好プロファイルをフォーマット
 */
export function formatPreferences(
  cuisines?: Record<string, number>,
  flavorProfile?: Record<string, number>
): string {
  const topCuisines = formatTopEntries(cuisines, 3);
  const topFlavors = formatTopEntries(flavorProfile, 3);

  return `好みのジャンル: ${topCuisines || "データなし"}, 好みの味: ${topFlavors || "データなし"}`;
}

/**
 * Record<string, number>からトップN項目を取得してフォーマット
 */
function formatTopEntries(
  record: Record<string, number> | undefined,
  n: number
): string {
  if (!record) return "";

  return Object.entries(record)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([k]) => k)
    .join(", ");
}

/**
 * 配列を安全にフォーマット
 */
export function formatArray(
  arr: string[] | undefined,
  fallback = "特になし"
): string {
  return arr && arr.length > 0 ? arr.join(", ") : fallback;
}
