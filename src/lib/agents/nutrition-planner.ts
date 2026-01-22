/**
 * FaveFit v2 - Nutrition Planner Agent
 * 栄養目標策定エージェント（Tool分離版）
 */

import { LlmAgent, FunctionTool } from "@google/adk";
import { z } from "zod";
import {
  calculateMacroGoals,
  CalculateMacroGoalsInputSchema,
} from "../tools/calculateMacroGoals";

/**
 * 入力スキーマ
 */
export const NutritionInputSchema = z.object({
  age: z.number().describe("ユーザーの年齢"),
  gender: z.enum(["male", "female"]).describe("性別"),
  height_cm: z.number().describe("身長 (cm)"),
  weight_kg: z.number().describe("体重 (kg)"),
  activity_level: z
    .enum(["low", "moderate", "high"])
    .describe("活動レベル (low: 座り仕事, moderate: 週2-3回運動, high: 激しい運動)"),
  goal: z
    .enum(["lose", "maintain", "gain"])
    .describe("目標 (lose: 減量, maintain: 維持, gain: 増量)"),
});

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

export type NutritionInput = z.infer<typeof NutritionInputSchema>;
export type NutritionOutput = z.infer<typeof NutritionOutputSchema>;

/**
 * Tool: 栄養計算
 * LLMではなく純粋な関数で計算するため高速・正確
 */
const nutritionCalculatorTool = new FunctionTool({
  name: "calculate_nutrition",
  description:
    "ユーザーの身体情報からBMR/TDEE/PFCを計算する。LLMで計算せず、このToolを呼び出すこと。",
  parameters: CalculateMacroGoalsInputSchema,
  execute: async (input) => {
    return calculateMacroGoals(input);
  },
});

/**
 * Nutrition Planner Agent
 */
export const nutritionPlannerAgent = new LlmAgent({
  name: "nutrition_planner",
  model: "gemini-2.5-flash",
  description: "ユーザーの身体情報から最適な栄養計画を策定する専門家。",
  instruction: `
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
  tools: [nutritionCalculatorTool],
  outputKey: "nutrition_plan",
});
