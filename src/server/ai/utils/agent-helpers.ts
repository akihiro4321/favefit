/**
 * FaveFit - AIエージェントヘルパー関数
 */

import { generateObject, LanguageModelV1 } from "ai";
import { z } from "zod";
import { geminiFlash, geminiPro, gemini25Flash } from "../config";
import { getTelemetryConfig } from "../observability";

// ============================================
// モデル選択
// ============================================

export type ModelType = "flash" | "pro" | "flash-2.5";

/**
 * モデルを取得
 */
export function getModel(type: ModelType = "flash"): LanguageModelV1 {
  if (type === "flash-2.5") return gemini25Flash;
  return type === "pro" ? geminiPro : geminiFlash;
}

// ============================================
// エージェント実行ヘルパー
// ============================================

/**
 * 複数のスキーマに対応するエージェント実行
 */
export async function callModelWithSchema<TSchema extends z.ZodType>(
  instructions: string,
  prompt: string,
  schema: TSchema,
  model: ModelType = "flash",
  agentName?: string,
  userId?: string,
  processName?: string,
): Promise<z.infer<TSchema>> {
  const { object } = await generateObject({
    model: getModel(model),
    system: instructions,
    prompt,
    schema,
    experimental_telemetry: getTelemetryConfig({
      agentName: agentName || "agent",
      userId,
      processName,
    }),
  });

  return object;
}

// ============================================
// プロンプト構築ヘルパー
// ============================================

/**
 * 嗜好プロファイルをフォーマット
 */
export function formatPreferences(
  cuisines?: Record<string, number>,
  flavorProfile?: Record<string, number>,
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
  n: number,
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
  fallback = "特になし",
): string {
  return arr && arr.length > 0 ? arr.join(", ") : fallback;
}
