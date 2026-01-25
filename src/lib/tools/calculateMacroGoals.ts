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
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .describe("活動レベル: sedentary=ほぼ運動しない, light=軽い運動(週1-2回), moderate=中度の運動(週3-5回), active=激しい運動(週6-7回), very_active=非常に激しい運動(1日2回)"),
  goal: z
    .enum(["lose", "maintain", "gain"])
    .describe("目標: lose=減量, maintain=維持, gain=増量"),
});

export const NutritionPreferencesSchema = z.object({
  lossPaceKgPerMonth: z.number().min(0.1).max(5).optional(),
  maintenanceAdjustKcalPerDay: z.number().min(-500).max(500).optional(),
  gainPaceKgPerMonth: z.number().min(0.1).max(5).optional(),
  gainStrategy: z.enum(["lean", "standard", "aggressive"]).optional(),
  macroPreset: z.enum(["balanced", "lowfat", "lowcarb", "highprotein"]).optional(),
});

export const CalculatePersonalizedMacroGoalsInputSchema = CalculateMacroGoalsInputSchema.extend({
  preferences: NutritionPreferencesSchema.optional(),
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
 * Mifflin-St Jeor式と組み合わせて使用される標準的な活動係数
 * 
 * 参考:
 * - Inch Calculator: https://www.inchcalculator.com/mifflin-st-jeor-calculator/
 * - Medscape: https://reference.medscape.com/calculator/846/mifflin-st-jeor
 * - ACE Fitness: https://www.acefitness.org/certifiednewsarticle/2882/resting-metabolic-rate-best-ways-to-measure-it-and-raise-it-too/
 * 
 * 元論文:
 * - Mifflin MD, et al. A new predictive equation for resting energy expenditure in healthy individuals.
 *   Am J Clin Nutr. 1990;51(2):241-7. https://doi.org/10.1093/ajcn/51.2.241
 */
const getActivityMultiplier = (level: "sedentary" | "light" | "moderate" | "active" | "very_active"): number => {
  switch (level) {
    case "sedentary":
      return 1.2; // ほぼ運動しない
    case "light":
      return 1.375; // 軽い運動 週に1-2回運動
    case "moderate":
      return 1.55; // 中度の運動 週に3-5回運動
    case "active":
      return 1.725; // 激しい運動やスポーツ 週に6-7回運動
    case "very_active":
      return 1.9; // 非常に激しい運動・肉体労働 1日に2回運動
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

const KCAL_PER_KG = 7700;
const DAYS_PER_MONTH = 30;

const getProteinPerKg = (
  goal: "lose" | "maintain" | "gain",
  gainStrategy: "lean" | "standard" | "aggressive" | undefined
): number => {
  let grams = goal === "lose" ? 2.0 : goal === "gain" ? 1.8 : 1.6;

  if (goal === "gain") {
    if (gainStrategy === "lean") grams += 0.2;
    if (gainStrategy === "aggressive") grams -= 0.1;
  }

  return grams;
};

const getFatPercent = (
  macroPreset: "balanced" | "lowfat" | "lowcarb" | "highprotein" | undefined
): number => {
  switch (macroPreset) {
    case "lowfat":
      return 0.2;
    case "lowcarb":
      return 0.35;
    case "highprotein":
    case "balanced":
    default:
      return 0.25;
  }
};

const calculatePersonalizedTargetCalories = (
  tdee: number,
  goal: "lose" | "maintain" | "gain",
  preferences: z.infer<typeof NutritionPreferencesSchema> | undefined
): number => {
  if (!preferences) {
    return adjustForGoal(tdee, goal);
  }

  if (goal === "maintain") {
    const adjust = preferences.maintenanceAdjustKcalPerDay ?? 0;
    return Math.round(tdee + adjust);
  }

  const pace =
    goal === "lose"
      ? preferences.lossPaceKgPerMonth ?? 1
      : preferences.gainPaceKgPerMonth ?? 0.5;
  const kcalPerDay = (KCAL_PER_KG * pace) / DAYS_PER_MONTH;

  return Math.round(goal === "lose" ? tdee - kcalPerDay : tdee + kcalPerDay);
};

const calculatePersonalizedPFC = (
  targetCalories: number,
  weight_kg: number,
  goal: "lose" | "maintain" | "gain",
  preferences: z.infer<typeof NutritionPreferencesSchema> | undefined
): { protein: number; fat: number; carbs: number } => {
  const proteinMultiplier = getProteinPerKg(goal, preferences?.gainStrategy);
  const protein = Math.round(weight_kg * proteinMultiplier);
  const proteinCalories = protein * 4;

  const fatPercent = getFatPercent(preferences?.macroPreset);
  const fatCalories = Math.round(targetCalories * fatPercent);
  const fat = Math.round(fatCalories / 9);

  const carbsCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const carbs = Math.round(carbsCalories / 4);

  return { protein, fat, carbs };
};

export const calculatePersonalizedMacroGoals = (
  input: z.infer<typeof CalculatePersonalizedMacroGoalsInputSchema>
): MacroGoalsResult => {
  const { age, gender, height_cm, weight_kg, activity_level, goal, preferences } = input;
  const bmr = calculateBMR(age, gender, height_cm, weight_kg);
  const tdee = Math.round(bmr * getActivityMultiplier(activity_level));
  const targetCalories = calculatePersonalizedTargetCalories(tdee, goal, preferences);
  const pfc = calculatePersonalizedPFC(targetCalories, weight_kg, goal, preferences);

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    pfc,
  };
};
