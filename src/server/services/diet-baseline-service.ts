/**
 * Diet Baseline Service
 * 現状の食生活と理想の栄養目標のギャップを分析し、
 * AI生成における「適応型（Adaptive）」な指示を生成する。
 */

import { UserProfile, UserNutrition } from "@/lib/schema";

interface AdaptiveDirective {
  baseCalories: number; // 生成時のベースとなるカロリー（理想値そのものではない場合がある）
  instructions: string[]; // AIプロンプトに追加する指示リスト
}

/**
 * テキスト入力（例: "おにぎり2個"）から概算カロリーを推定する簡易ロジック
 * ※本来はここもAIやAPIで厳密にやるべきだが、まずは簡易的なキーワードマッチングで実装
 */
const estimateMealCalories = (text: string): number => {
  if (!text) return 0;
  
  let calories = 0;
  
  // キーワードベースの簡易推定
  const keywords = [
    { word: "おにぎり", kcal: 200 },
    { word: "ご飯", kcal: 250 },
    { word: "パン", kcal: 150 },
    { word: "トースト", kcal: 200 },
    { word: "サラダ", kcal: 50 },
    { word: "定食", kcal: 800 },
    { word: "弁当", kcal: 700 },
    { word: "ラーメン", kcal: 900 },
    { word: "パスタ", kcal: 700 },
    { word: "カレー", kcal: 800 },
    { word: "プロテイン", kcal: 100 },
    { word: "卵", kcal: 80 },
    { word: "納豆", kcal: 80 },
    { word: "なし", kcal: 0 },
    { word: "抜き", kcal: 0 },
    { word: "コーヒー", kcal: 10 },
  ];

  for (const k of keywords) {
    if (text.includes(k.word)) {
      // 数量の簡易判定 ("2個"など)
      const countMatch = text.match(/(\d+)個/);
      const count = countMatch ? parseInt(countMatch[1]) : 1;
      calories += k.kcal * count;
    }
  }

  // キーワードにヒットしなかった場合でも、何か入力されていれば最低限の値を設定
  if (calories === 0 && text.length > 3) {
    return 400; // デフォルト値
  }

  return calories;
};

export class DietBaselineService {
  /**
   * 現状の食生活を分析し、概算摂取カロリーを算出
   */
  calculateCurrentIntake(currentDiet: UserProfile["lifestyle"]["currentDiet"]): number {
    if (!currentDiet) return 0;

    const breakfast = estimateMealCalories(currentDiet.breakfast || "");
    const lunch = estimateMealCalories(currentDiet.lunch || "");
    const dinner = estimateMealCalories(currentDiet.dinner || "");
    const snack = estimateMealCalories(currentDiet.snack || "");

    return breakfast + lunch + dinner + snack;
  }

  /**
   * ギャップ分析とAI指示の生成
   */
  createAdaptiveDirective(
    profile: UserProfile,
    target: UserNutrition
  ): AdaptiveDirective {
    const currentDiet = profile.lifestyle.currentDiet;
    
    // 現状データがない場合は、標準の目標値をそのまま使用
    if (!currentDiet) {
      return {
        baseCalories: target.dailyCalories,
        instructions: ["ユーザーの現状データがないため、計算された理想目標を目指してください。"]
      };
    }

    const currentCalories = this.calculateCurrentIntake(currentDiet);
    
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
