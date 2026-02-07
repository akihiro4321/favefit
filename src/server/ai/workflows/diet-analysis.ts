/**
 * Diet Analysis Workflow
 * ユーザーの食生活データを解析し、栄養学的な洞察を提供するワークフロー
 */

import { UserProfile } from "@/lib/schema";
import { runDietBaselineEstimator } from "../agents/diet-baseline-estimator";

export interface DietAnalysisWorkflowInput {
  currentDiet: UserProfile["lifestyle"]["currentDiet"];
  userId?: string;
}

export interface DietAnalysisWorkflowResult {
  totalCalories: number;
  breakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
}

/**
 * 普段の食事内容から摂取カロリーを分析するワークフロー
 */
export async function analyzeCurrentIntake(
  input: DietAnalysisWorkflowInput
): Promise<DietAnalysisWorkflowResult> {
  const { currentDiet, userId } = input;

  if (!currentDiet) {
    return {
      totalCalories: 0,
      breakdown: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
    };
  }

  // 各食事内容から栄養価を推定するヘルパー
  const estimate = async (text?: string) => {
    if (!text || text.trim() === "") return 0;
    
    // 「なし」系キーワードの簡易チェック
    const skipKeywords = ["なし", "抜き", "食べない", "nothing", "none"];
    if (skipKeywords.some(k => text.includes(k))) return 0;

    try {
      const result = await runDietBaselineEstimator(text, userId);
      return result.calories;
    } catch (error) {
      console.warn(`[DietAnalysisWorkflow] Failed to estimate calories for "${text}"`, error);
      return text.length > 3 ? 400 : 0;
    }
  };

  // 並列で推定を実行
  const [breakfast, lunch, dinner, snack] = await Promise.all([
    estimate(currentDiet.breakfast),
    estimate(currentDiet.lunch),
    estimate(currentDiet.dinner),
    estimate(currentDiet.snack)
  ]);

  return {
    totalCalories: breakfast + lunch + dinner + snack,
    breakdown: { breakfast, lunch, dinner, snack }
  };
}
