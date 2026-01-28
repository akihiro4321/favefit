/**
 * FaveFit - Nutrition Planner Agent
 * 栄養目標策定エージェント
 */

import { z } from "zod";
import { runTextAgent, parseJsonFromText } from "../utils/agent-helpers";
import { nutritionCalculatorTool } from "../tools/nutrition-calculator";

// ============================================
// スキーマ定義
// ============================================

export const NutritionOutputSchema = z.object({
  daily_calorie_target: z.number().describe("1日の目標カロリー (kcal)"),
  protein_g: z.number().describe("タンパク質 (g)"),
  fat_g: z.number().describe("脂質 (g)"),
  carbs_g: z.number().describe("炭水化物 (g)"),
  strategy_summary: z.string().describe("プランの解説（2-3文）"),
});

export type NutritionOutput = z.infer<typeof NutritionOutputSchema>;

// ============================================
// プロンプト
// ============================================

const INSTRUCTIONS = `
あなたは科学的根拠に基づく栄養計画の専門家です。

【重要】
- 数値計算は必ず calculate_nutrition ツールを使用すること。自分で計算しないでください。
- 計算結果（カロリー、タンパク質、脂質、炭水化物）とプランの解説（2-3文）をJSON形式で出力してください。

【出力形式】
JSON形式で以下のキーを含めてください:
- daily_calorie_target: number
- protein_g: number
- fat_g: number
- carbs_g: number
- strategy_summary: string
`;

// ============================================
// エージェント実行
// ============================================

/**
 * Nutrition Planner を実行
 * ツールを使用して栄養計算を行い、結果をJSON形式で返す
 */
export async function runNutritionPlanner(
  prompt: string
): Promise<NutritionOutput | null> {
  const text = await runTextAgent(
    {
      instructions: INSTRUCTIONS,
      maxSteps: 5,
      tools: { calculate_nutrition: nutritionCalculatorTool },
      agentName: "nutrition-planner",
    },
    prompt
  );

  return parseJsonFromText(text, NutritionOutputSchema);
}
