import { LlmAgent, zodObjectToSchema } from '@google/adk';
import { z } from 'zod';

/**
 * 入力データのバリデーション用スキーマ
 */
export const NutritionInputSchema = z.object({
  age: z.number().describe('ユーザーの年齢'),
  gender: z.enum(['male', 'female', 'other']).describe('性別'),
  height_cm: z.number().describe('身長 (cm)'),
  weight_kg: z.number().describe('体重 (kg)'),
  activity_level: z.enum(['low', 'moderate', 'high']).describe('活動レベル (low: ほぼ運動なし, moderate: 週2-3回運動, high: 激しい運動)'),
  goal: z.enum(['lose', 'maintain', 'gain']).describe('ダイエット目標 (lose: 減量, maintain: 維持, gain: 増量)'),
});

/**
 * 出力データの型定義
 */
export const NutritionOutputSchema = z.object({
  daily_calorie_target: z.number().describe('1日の摂取目標カロリー (kcal)'),
  protein_g: z.number().describe('タンパク質の目標量 (g)'),
  fat_g: z.number().describe('脂質の目標量 (g)'),
  carbs_g: z.number().describe('炭水化物の目標量 (g)'),
  strategy_summary: z.string().describe('算出根拠の短い説明'),
});

export type NutritionInput = z.infer<typeof NutritionInputSchema>;
export type NutritionOutput = z.infer<typeof NutritionOutputSchema>;

/**
 * Nutrition Planner Agent
 */
export const nutritionPlannerAgent = new LlmAgent({
  name: 'nutrition_planner',
  model: 'gemini-2.5-flash',
  description: 'ユーザーの身体情報から最適な栄養計画を算出する専門家。',
  instruction: `
あなたは科学的根拠に基づく栄養計画の専門家です。
ユーザーの身体情報からBMRとTDEEを計算し、ダイエット目標に合わせた1日の目標値を算出してJSONで回答してください。

【計算ルール】
1. Mifflin-St Jeor式でBMRを計算。
2. 活動レベルを掛け合わせてTDEEを算出。
3. 目標(goal)に応じて調整（lose: -500, maintain: 0, gain: +300）。
4. タンパク質は体重1kgあたり2gを目安、脂質は総カロリーの25%程度、残りを炭水化物とする。
`,
  outputSchema: zodObjectToSchema(NutritionOutputSchema),
  outputKey: 'nutrition_plan',
});
