/**
 * FaveFit - AIエージェントヘルパー関数
 */

import { generateObject, generateText, LanguageModelV1 } from "ai";
import { z } from "zod";
import { geminiFlash, geminiPro } from "../config";
import { getTelemetryConfig } from "../observability";

// ============================================
// モデル選択
// ============================================

export type ModelType = "flash" | "pro";

/**
 * モデルを取得
 */
export function getModel(type: ModelType = "flash"): LanguageModelV1 {
  return type === "pro" ? geminiPro : geminiFlash;
}

// ============================================
// エージェント実行ヘルパー
// ============================================

export interface AgentConfig<TSchema extends z.ZodType> {
  /** システムプロンプト */
  instructions: string;
  /** 出力スキーマ */
  schema: TSchema;
  /** 使用するモデル */
  model?: ModelType;
  /** エージェント名（テレメトリ用） */
  agentName?: string;
  /** ユーザーID（テレメトリ用） */
  userId?: string;
}

/**
 * 構造化出力を生成するエージェントを実行
 */
export async function runAgent<TSchema extends z.ZodType>(
  config: AgentConfig<TSchema>,
  prompt: string
): Promise<z.infer<TSchema>> {
  const { object } = await generateObject({
    model: getModel(config.model),
    prompt,
    schema: config.schema,
    experimental_telemetry: getTelemetryConfig(
      config.agentName || "agent",
      config.userId
    ),
  });

  return object;
}

/**
 * 複数のスキーマに対応するエージェント実行
 */
export async function runAgentWithSchema<TSchema extends z.ZodType>(
  instructions: string,
  prompt: string,
  schema: TSchema,
  model: ModelType = "flash",
  agentName?: string,
  userId?: string
): Promise<z.infer<TSchema>> {
  const { object } = await generateObject({
    model: getModel(model),
    system: instructions,
    prompt,
    schema,
    experimental_telemetry: getTelemetryConfig(
      agentName || "agent",
      userId
    ),
  });

  return object;
}

// ============================================
// テキスト生成・パースヘルパー
// ============================================

export interface TextAgentConfig {
  instructions: string;
  model?: ModelType;
  maxSteps?: number;
  tools?: Record<string, unknown>;
  agentName?: string;
  userId?: string;
}

/**
 * テキスト生成エージェントを実行
 */
export async function runTextAgent(
  config: TextAgentConfig,
  prompt: string
): Promise<string> {
  const result = await generateText({
    model: getModel(config.model),
    system: config.instructions,
    prompt,
    maxSteps: config.maxSteps,
    tools: config.tools as Parameters<typeof generateText>[0]["tools"],
    experimental_telemetry: getTelemetryConfig(
      config.agentName || "text-agent",
      config.userId
    ),
  });

  return result.text;
}

/**
 * テキストからJSONを抽出してパース
 */
export function parseJsonFromText<TSchema extends z.ZodType>(
  text: string,
  schema: TSchema
): z.infer<TSchema> | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return schema.parse(parsed);
    }
  } catch (error) {
    console.error("Failed to parse JSON from text:", error);
  }
  return null;
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
