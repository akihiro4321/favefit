/**
 * FaveFit - AIエージェントヘルパー関数
 */

import { z } from "zod";
import { generateText, Output, LanguageModel } from "ai";

// ============================================
// エージェント実行ヘルパー
// ============================================

/**
 * 複数のスキーマに対応するエージェント実行 (Vercel AI SDK)
 * generateText + output設定を使用 (generateObjectは非推奨)
 */
export async function callModelWithSchema<TSchema extends z.ZodType>(
  instructions: string,
  prompt: string,
  schema: TSchema,
  // 文字列IDではなくAI SDKのモデルオブジェクトを受け取るように変更
  model: LanguageModel
): Promise<z.infer<TSchema>> {
  try {
    const result = await generateText({
      model: model,
      system: instructions,
      prompt: prompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: Output.object({ schema: schema as any }),
    });

    if (result.output === undefined || result.output === null) {
      throw new Error("Model failed to generate structured output.");
    }

    return result.output as z.infer<TSchema>;
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
