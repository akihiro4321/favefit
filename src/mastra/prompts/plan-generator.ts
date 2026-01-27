/**
 * プラン生成用プロンプト定義
 */

export const PLAN_GENERATOR_INSTRUCTIONS = `
あなたはダイエット成功をサポートする献立プランナーです。
以下のガイドラインに従って、最適な食事プランを生成してください。

【最重要：栄養素の出力ルール】
1. 各食事の「nutrition」は、提案するレシピの食材・分量に基づいて、できる限り正確に推定（計算）して出力してください。
2. 入力に「mealTargets」が含まれている場合、それらの数値（目標値）にできるだけ近づくように食材の分量を調整してください。
3. すべてのレシピで機械的に全く同じ栄養数値を出力するのではなく、食材内容に応じた現実的な数値を算出してください。ただし、目標値から大きく（15%以上）逸脱しないようにしてください。
4. 栄養バランス（PFCバランス）を重視し、実際にその料理を作った場合に得られる栄養素が反映されている必要があります。
5. 自分で栄養計算を行い、その結果を「nutrition」フィールドに格納してください。

【mealTargetsがない場合の栄養計算】
- targetCalories と pfc から各食事の栄養素を計算してください。
- 配分: 朝20%、昼40%、夜40%
- 計算式: タンパク質 4kcal/g, 脂質 9kcal/g, 炭水化物 4kcal/g

【レシピ構成比率】
- 定番（お気に入り・類似レシピ）: 40%
- 発見（新ジャンル・トレンド）: 40%
- 低コスト（安価な旬食材活用）: 20%

【その他のルール】
1. dislikedIngredients（苦手な食材）は絶対に使用しないでください。
2. 食材の使い回しを意識し、無駄のないプランにしてください。
3. 食材リスト（ingredients）は、必ず「name」と「amount」に分けて出力してください。
   - 1つの「name」に複数の食材を入れず、必ず1食材1要素に分解してください。
   - 【例】
     × Bad: { "name": "醤油、砂糖、酒", "amount": "各小さじ1" }
     ○ Good: 
       { "name": "醤油", "amount": "小さじ1" },
       { "name": "砂糖", "amount": "小さじ1" },
       { "name": "酒", "amount": "小さじ1" }
4. チートデイは栄養計算の枠外とし、ユーザーが楽しめるメニューを提案してください。
5. 【調味料・常備品の分量表現】
   - 一般的な調味料や常備品（油、醤油、塩、砂糖など）については、以下の表現を優先的に使用してください：
     「大さじ」「小さじ」「少々」「適量」「少量」「たっぷり」「ひとつまみ」
   - これにより、買い物リストで「常備品」として正しく分類・隔離されます。

※説明や挨拶は一切不要です。JSONデータのみを出力してください。
`;

interface PlanGenerationPromptArgs {
  duration: number;
  user_info: string;
  feedback_text: string;
}

interface SingleMealFixPromptArgs {
  mealTypeJa: string;
  target: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  dislikedIngredients: string[];
  existingTitles: string[];
}

/**
 * 指定期間の食事プラン生成用プロンプトを生成します。
 */
export const getPlanGenerationPrompt = ({
  duration,
  user_info,
  feedback_text,
}: PlanGenerationPromptArgs): string => {
  // ここにプロンプトの内容を貼り付けてください
  return `
以下の情報に基づいて${duration}日間の食事プランを生成してください。

【ユーザー情報】
${user_info}

${feedback_text}
`;
};
/**
 * 単体の食事修正用プロンプトを生成します。
 */
export const getSingleMealFixPrompt = ({
  mealTypeJa,
  target,
  dislikedIngredients,
  existingTitles,
}: SingleMealFixPromptArgs): string => {
  return `以下の条件で${mealTypeJa}のレシピを1つだけ生成してください。

【目標栄養素】
- カロリー: ${target.calories}kcal
- タンパク質: ${target.protein}g
- 脂質: ${target.fat}g
- 炭水化物: ${target.carbs}g

上記の数値を目標としつつ、食材・分量に基づいた推定値をnutritionに出力してください。目標値から大きく（15%以上）乖離しないように調整してください。

【避けるべき食材】
${dislikedIngredients.length > 0 ? dislikedIngredients.join(", ") : "なし"}

【避けるべきメニュー名（重複回避）】
${existingTitles.slice(0, 10).join(", ")}`;
};

interface InvalidMealInfo {
  date: string;
  mealType: string;
  mealTypeJa: string;
  target: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

interface BatchMealFixPromptArgs {
  invalidMeals: InvalidMealInfo[];
  dislikedIngredients: string[];
  existingTitles: string[];
}

/**
 * 複数の不合格食事を一括修正するためのプロンプトを生成します。
 */
export const getBatchMealFixPrompt = ({
  invalidMeals,
  dislikedIngredients,
  existingTitles,
}: BatchMealFixPromptArgs): string => {
  const mealsDescription = invalidMeals.map((meal, index) => `
${index + 1}. ${meal.date} の ${meal.mealTypeJa}
   - キー: "${meal.date}_${meal.mealType}"
   - 目標カロリー: ${meal.target.calories}kcal
   - 目標タンパク質: ${meal.target.protein}g
   - 目標脂質: ${meal.target.fat}g
   - 目標炭水化物: ${meal.target.carbs}g`).join("\n");

  return `以下の ${invalidMeals.length} 件の食事について、それぞれ新しいレシピを生成してください。

【修正が必要な食事一覧】
${mealsDescription}

【重要な栄養素ルール】
- 各食事の目標栄養素に対して±15%以内に収めてください。
- 食材・分量に基づいた現実的な推定値をnutritionに出力してください。

【避けるべき食材】
${dislikedIngredients.length > 0 ? dislikedIngredients.join(", ") : "なし"}

【避けるべきメニュー名（重複回避）】
${existingTitles.slice(0, 20).join(", ")}

※説明や挨拶は一切不要です。JSONデータのみを出力してください。`;
};
