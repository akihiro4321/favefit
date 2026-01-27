/**
 * FaveFit - Nutrition Planner Agent (Mastra形式)
 * 栄養目標策定エージェント
 */

import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { nutritionCalculatorTool } from "../tools/calculateMacroGoals";

/**
 * 出力スキーマ
 */
export const NutritionOutputSchema = z.object({
  daily_calorie_target: z.number().describe("1日の目標カロリー (kcal)"),
  protein_g: z.number().describe("タンパク質 (g)"),
  fat_g: z.number().describe("脂質 (g)"),
  carbs_g: z.number().describe("炭水化物 (g)"),
  strategy_summary: z.string().describe("プランの解説（2-3文）"),
});

export type NutritionOutput = z.infer<typeof NutritionOutputSchema>;

/**
 * Nutrition Planner Agent
 */
export const nutritionPlannerAgent = new Agent({
  id: "nutrition_planner",
  name: "Nutrition Planner",
  instructions: `
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
`,
  model: "google/gemini-flash-latest",
  tools: {
    calculate_nutrition: nutritionCalculatorTool,
  },
});
