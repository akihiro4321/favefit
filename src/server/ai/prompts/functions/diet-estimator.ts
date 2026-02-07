/**
 * Diet Baseline Estimator - Prompts
 */

import { UserProfile } from "@/lib/schema";

export const DIET_BASELINE_ESTIMATOR_INSTRUCTIONS = `あなたはプロの管理栄養士です。入力された1日の食事内容（朝食、昼食、夕食、間食）から、それぞれの栄養価および1日の合計栄養価を推定してください。`;

/**
 * 1日の食事内容から栄養価を推定するためのプロンプト生成
 */
export const getDailyDietBaselinePrompt = (
  currentDiet?: UserProfile["lifestyle"]["currentDiet"],
) => `
以下の1日の食事内容から、それぞれのスロットごとのおおよその栄養価（カロリー、タンパク質、脂質、炭水化物）を推定してください。

【食事内容】
- 朝食: "${currentDiet?.breakfast || "なし"}"
- 昼食: "${currentDiet?.lunch || "なし"}"
- 夕食: "${currentDiet?.dinner || "なし"}"
- 間食: "${currentDiet?.snack || "なし"}"

ルール:
1. 一般的な一人前の分量を基準にしてください。
2. 具体的な数量（例: "卵2個"）がある場合はそれを反映してください。
3. "なし", "抜き", "食べない" などの記述がある場合はすべて0にしてください。
4. 不明な点がある場合は、一般的な値（例：外食なら少し高め）を使用してください。
5. 日本の一般的な食事基準で計算してください。
6. 全てのスロット（breakfast, lunch, dinner, snack）に対して必ず数値を割り当ててください。
`;