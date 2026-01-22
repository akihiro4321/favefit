/**
 * FaveFit v2 - 栄養計算 Tool
 * Mifflin-St Jeor式によるPFC計算
 */

import { z } from "zod";

// 入力スキーマ
export const CalculateMacroGoalsInputSchema = z.object({
  age: z.number().min(10).max(100).describe("年齢"),
  gender: z.enum(["male", "female"]).describe("性別"),
  height_cm: z.number().min(100).max(250).describe("身長(cm)"),
  weight_kg: z.number().min(30).max(200).describe("体重(kg)"),
  activity_level: z
    .enum(["low", "moderate", "high"])
    .describe("活動レベル: low=座り仕事, moderate=適度な運動, high=激しい運動"),
  goal: z
    .enum(["lose", "maintain", "gain"])
    .describe("目標: lose=減量, maintain=維持, gain=増量"),
});

// 出力型
export interface MacroGoalsResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  pfc: {
    protein: number;
    fat: number;
    carbs: number;
  };
}

/**
 * BMR計算 (Mifflin-St Jeor式)
 */
const calculateBMR = (
  age: number,
  gender: "male" | "female",
  height_cm: number,
  weight_kg: number
): number => {
  if (gender === "male") {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }
};

/**
 * 活動レベル係数
 */
const getActivityMultiplier = (level: "low" | "moderate" | "high"): number => {
  switch (level) {
    case "low":
      return 1.2;
    case "moderate":
      return 1.55;
    case "high":
      return 1.9;
  }
};

/**
 * 目標に応じたカロリー調整
 */
const adjustForGoal = (
  tdee: number,
  goal: "lose" | "maintain" | "gain"
): number => {
  switch (goal) {
    case "lose":
      return Math.round(tdee * 0.8); // 20%減
    case "maintain":
      return Math.round(tdee);
    case "gain":
      return Math.round(tdee * 1.15); // 15%増
  }
};

/**
 * PFC比率計算
 * タンパク質: 体重 × 1.6g (減量時は2.0g)
 * 脂質: 総カロリーの25%
 * 炭水化物: 残り
 */
const calculatePFC = (
  targetCalories: number,
  weight_kg: number,
  goal: "lose" | "maintain" | "gain"
): { protein: number; fat: number; carbs: number } => {
  const proteinMultiplier = goal === "lose" ? 2.0 : 1.6;
  const protein = Math.round(weight_kg * proteinMultiplier);
  const proteinCalories = protein * 4;

  const fatCalories = targetCalories * 0.25;
  const fat = Math.round(fatCalories / 9);

  const carbsCalories = targetCalories - proteinCalories - fatCalories;
  const carbs = Math.round(carbsCalories / 4);

  return { protein, fat, carbs };
};

/**
 * メイン計算関数 (ADK Tool として使用)
 */
export const calculateMacroGoals = (
  input: z.infer<typeof CalculateMacroGoalsInputSchema>
): MacroGoalsResult => {
  const { age, gender, height_cm, weight_kg, activity_level, goal } = input;

  const bmr = calculateBMR(age, gender, height_cm, weight_kg);
  const tdee = Math.round(bmr * getActivityMultiplier(activity_level));
  const targetCalories = adjustForGoal(tdee, goal);
  const pfc = calculatePFC(targetCalories, weight_kg, goal);

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    pfc,
  };
};
