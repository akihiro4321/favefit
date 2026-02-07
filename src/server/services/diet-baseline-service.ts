/**
 * Diet Baseline Service
 * 現状の食生活と理想の栄養目標のギャップを分析し、
 * AI生成における「適応型（Adaptive）」な指示を生成する。
 */

import { UserProfile, UserNutrition } from "@/lib/schema";
import { analyzeCurrentIntake } from "../ai/workflows/diet-analysis";

interface AdaptiveDirective {
  baseCalories: number; // 生成時のベースとなるカロリー（理想値そのものではない場合がある）
  instructions: string[]; // AIプロンプトに追加する指示リスト
}

export class DietBaselineService {
  /**
   * 現状の食生活を分析し、概算摂取カロリーを算出
   */
  async calculateCurrentIntake(
    currentDiet: UserProfile["lifestyle"]["currentDiet"],
    userId?: string
  ): Promise<number> {
    const result = await analyzeCurrentIntake({ currentDiet, userId });
    return result.totalCalories;
  }

  /**
   * ギャップ分析とAI指示の生成
   */
  async createAdaptiveDirective(
    profile: UserProfile,
    target: UserNutrition,
    userId?: string
  ): Promise<AdaptiveDirective> {
    const currentDiet = profile.lifestyle.currentDiet;
    
    // 現状データがない場合は、標準の目標値をそのまま使用
    if (!currentDiet) {
      return {
        baseCalories: target.dailyCalories,
        instructions: ["ユーザーの現状データがないため、計算された理想目標を目指してください。"]
      };
    }

    const currentCalories = await this.calculateCurrentIntake(currentDiet, userId);
    
    // 異常値（極端に少ない/多い）の場合は補正
    if (currentCalories < 500) {
      return {
         baseCalories: target.dailyCalories,
         instructions: ["現状の摂取カロリーが極端に低く見積もられていますが、健康維持のために理想目標を目指してください。"]
      };
    }

    const diff = target.dailyCalories - currentCalories;
    const instructions: string[] = [];
    let baseCalories = target.dailyCalories;

    // 増量目標だが、現状が少なすぎる場合 -> いきなり増やさず、中間地点を設定
    if (profile.physical.goal === "gain" && diff > 500) {
      baseCalories = currentCalories + 300; // 無理のない範囲で+300
      instructions.push(
        `現在の摂取量(${currentCalories}kcal)に対し目標(${target.dailyCalories}kcal)が高いため、まずは無理なく食べられる量（約${baseCalories}kcal）を目指してください。`
      );
      instructions.push("一度に量を増やすのではなく、間食を活用したり、消化の良い炭水化物を増やす提案をしてください。");
    }
    
    // 減量目標だが、現状が多すぎる場合 -> いきなり減らさず、中間地点を設定
    else if (profile.physical.goal === "lose" && diff < -500) {
      baseCalories = currentCalories - 300; // 無理のない範囲で-300
      instructions.push(
        `現在の摂取量(${currentCalories}kcal)に対し目標(${target.dailyCalories}kcal)が低いため、急激な制限を避け、まずは約${baseCalories}kcalを目指してください。`
      );
      instructions.push("満腹感を得やすい野菜や食物繊維を多めに取り入れ、ストレスの少ない減量プランにしてください。");
    }
    
    else {
      instructions.push(`現在の食生活(${currentCalories}kcal)と目標(${target.dailyCalories}kcal)のギャップは適正範囲内です。`);
    }

    // 朝食の特性を考慮
    if (currentDiet.breakfast && (currentDiet.breakfast.includes("なし") || currentDiet.breakfast.includes("コーヒー"))) {
      instructions.push("朝食を食べない習慣があるようです。どうしても必要な栄養摂取以外は、無理に重い朝食を提案せず、スムージーやプロテインなど軽いものを提案してください。");
    }

    return {
      baseCalories,
      instructions
    };
  }
}

export const dietBaselineService = new DietBaselineService();