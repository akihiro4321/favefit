import { DailySkeleton } from "../../types/plan-v2";
import { NutritionValues } from "../../types/common";

export const DAILY_DETAIL_GENERATOR_INSTRUCTIONS = `あなたはプロの管理栄養士兼シェフです。提示された「献立スケルトン」に基づき、1日分（3食）の詳細なレシピを作成してください。

以下のガイドラインを厳守してください：
1. **メニュー名の固定**: スケルトンで指定されたメニュー名をそのまま使用してください。
2. **精密な栄養計算**: 提示された目標PFCバランスにできるだけ近づけてください。分量(g)を調整することで栄養価を合わせます。
3. **現実的なレシピ**: 一般的な家庭で15-30分で作れる手順にしてください。
4. **食材の分解**: 1つの要素(name)に複数の食材を入れず、必ず1食材1要素に分解してください。
5. **在庫の考慮**: プロンプトで「手元にある食材（または今週買う予定の食材）」が提示されている場合は、それを優先的に使い、新規の食材を増やしすぎないでください。
`;

interface DailyDetailPromptInput {
  date: string;
  meals: DailySkeleton["meals"];
  targets: {
    breakfast: NutritionValues;
    lunch: NutritionValues;
    dinner: NutritionValues;
    snack?: NutritionValues;
  };
  shoppingList: string[];
}

export function getDailyDetailPrompt(input: DailyDetailPromptInput) {
  const snackInfo = input.meals.snack 
    ? `- 間食: "${input.meals.snack.title}" (目標: ${JSON.stringify(input.targets.snack)})`
    : "- 間食: なし";

  return `
【対象日】: ${input.date}

【献立スケルトンと栄養目標】
- 朝食: "${input.meals.breakfast.title}" (目標: ${JSON.stringify(input.targets.breakfast)})
- 昼食: "${input.meals.lunch.title}" (目標: ${JSON.stringify(input.targets.lunch)})
- 夕食: "${input.meals.dinner.title}" (目標: ${JSON.stringify(input.targets.dinner)})
${snackInfo}

【使用可能な食材プール（今週の買い物リスト）】
${input.shoppingList.join(", ")}

各メニューについて、詳細な「材料（分量付き）」「調理手順」「正確な栄養価」を算出し、JSON形式で出力してください。
`;
}
