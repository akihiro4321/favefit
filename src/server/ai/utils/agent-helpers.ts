/**
 * FaveFit - AIエージェントヘルパー関数
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { genAI } from "../config";

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
  model: string,
): Promise<z.infer<TSchema>> {
  // JSON Schema 生成
  const jsonSchema = zodToJsonSchema(schema, { target: "openApi3" });

  try {
    const result = await genAI.models.generateContent({
      model: model,
      config: {
        systemInstruction: {
          parts: [{ text: instructions }],
          role: "system",
        },
        responseMimeType: "application/json",
        responseSchema: jsonSchema as any,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    // @google/genai SDK response handling
    let responseText: string | undefined | null;

    // Check if helper method exists (common in Google SDKs)
    if (typeof (result as any).text === "function") {
      responseText = (result as any).text();
    } else {
      // Fallback to direct candidate access
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!responseText) {
      throw new Error("No response from Gemini");
    }

    const json = JSON.parse(responseText);
    // Zod でバリデーション
    return schema.parse(json);
  } catch (error) {
    console.error("Gemini API Error:", error);
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
