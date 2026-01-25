/**
 * FaveFit - 栄養計算 Tool (Mastra形式)
 * Mifflin-St Jeor式によるPFC計算
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  calculatePersonalizedMacroGoals,
  CalculatePersonalizedMacroGoalsInputSchema,
} from "@/lib/tools/calculateMacroGoals";

/**
 * 出力スキーマ
 */
const CalculateMacroGoalsOutputSchema = z.object({
  bmr: z.number().describe("基礎代謝量 (BMR)"),
  tdee: z.number().describe("総消費エネルギー量 (TDEE)"),
  targetCalories: z.number().describe("目標カロリー"),
  pfc: z.object({
    protein: z.number().describe("タンパク質 (g)"),
    fat: z.number().describe("脂質 (g)"),
    carbs: z.number().describe("炭水化物 (g)"),
  }),
});

/**
 * 栄養計算ツール
 */
export const nutritionCalculatorTool = createTool({
  id: "calculate_nutrition",
  description:
    "ユーザーの身体情報からBMR/TDEE/PFCを計算する。LLMで計算せず、このToolを呼び出すこと。",
  inputSchema: CalculatePersonalizedMacroGoalsInputSchema,
  outputSchema: CalculateMacroGoalsOutputSchema,
  execute: async (inputData: z.infer<typeof CalculatePersonalizedMacroGoalsInputSchema>) => {
    return calculatePersonalizedMacroGoals(inputData);
  },
});
