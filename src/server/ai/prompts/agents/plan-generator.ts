/**
 * プラン生成用プロンプト定義
 */

export const PLAN_GENERATOR_INSTRUCTIONS = `
あなたはダイエットをサポートする献立プランナーです。
ワークフロー側で事前計算された「スロット別ターゲット」に基づき、1週間分の食事プランを完成させてください。

【最優先ルール: 数値と現実の優先順位】
1. アンカー（ANCHOR）の遵守:
   「確定済みメニュー」として渡されたスロットは、タイトル・栄養価を一字一句変えずにそのまま出力してください。
   レシピの内容（材料・手順）は、そのタイトルに整合するように生成してください。

2. 空き枠（AUTO）の生成:
   指定された「目標数値（Target）」を目指してレシピを考案してください。
   ただし、**「ユーザーの普段の食事量（Baseline）」**を絶対に超えないことを最優先してください。

3. ポーション制御 (物理的上限の絶対遵守):
   目標数値を達成するためであっても、以下の物理的な上限を絶対に超えてはいけません。
   - 米・麺類: 1食最大 250g (炊きあがり/茹であがり) まで。
   - 主菜（肉・魚）: 1食最大 200g (生重量) まで。
   もし目標達成のためにこれを超える量が必要な場合、数値の達成を諦め、上記上限を守った「食べきれる量」を提案してください。不足分は副菜や汁物で補い、可能な限り目標に近づけてください。

4. 食材の効率性: 食材の使い回しを意識し、無駄のないプランにしてください。

5.レシピの表現 (Few-shot 例):
   食材リストは必ず「name」と「amount」に分解し、人間が読みやすい一般的な表現を使用してください。
   
6. 食材名の正規化 (買い物リスト用):
   - 食材名（name）には「薄切り」「一口大」「皮なし」などの調理・状態情報を含めないでください。
   - 例: "豚肉（薄切り）" -> "豚肉" / "玉ねぎ（みじん切り）" -> "玉ねぎ"
   - 複合的な表現は分解してください（例："塩コショウで炒めた肉" -> "豚肉", "塩", "コショウ"）。

   [Bad Example]
   ingredients: [ { name: "醤油と生姜で下味をつけた鶏肉", amount: "200g" } ]
   
   [Good Example]
   ingredients: [
     { name: "鶏肉", amount: "200g" },
     { name: "醤油", amount: "大さじ1" },
     { name: "生姜", amount: "1かけ" }
   ]

【出力形式】
JSONデータのみを出力してください。
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

interface FillPlanPromptArgs {
  duration: number;
  user_info: string;
  slot_targets: string; // スロット別ターゲットの記述
  feedback_text: string;
}

interface BatchMealFixPromptArgs {
  invalidMeals: InvalidMealInfo[];
  dislikedIngredients: string[];
  existingTitles: string[];
  fixedMeals?: Record<string, { title: string }>;
  mealConstraints?: Record<string, string>;
}

/**
 * Anchor & Fill戦略: 残りの枠（Fill）を埋めるためのプロンプト
 */
export const getFillPlanPrompt = ({
  duration,
  user_info,
  slot_targets,
  feedback_text,
}: FillPlanPromptArgs): string => {
  return `
以下の情報に基づいて${duration}日間の食事プランを完成させてください。

【ユーザー情報】
${user_info}

【スロット別作成指示】
以下の指示に従って各食事スロットを埋めてください。

${slot_targets}

${feedback_text}
`;
};

/**
 * 複数の不合格食事を一括修正するためのプロンプトを生成します。
 */
export const getBatchMealFixPrompt = ({
  invalidMeals,
  dislikedIngredients,
  existingTitles,
  fixedMeals,
  mealConstraints,
}: BatchMealFixPromptArgs): string => {
  const mealsDescription = invalidMeals.map((meal, index) => {
    const fixedInfo = fixedMeals?.[meal.mealType] ? `\n   - 【絶対遵守】このスロットは固定メニュー「${fixedMeals[meal.mealType].title}」を指定してください。` : "";
    const constraintInfo = mealConstraints?.[meal.mealType] ? `\n   - 【要望】${mealConstraints[meal.mealType]}` : "";
    
    return `
${index + 1}. ${meal.date} の ${meal.mealTypeJa}
   - キー: "${meal.date}_${meal.mealType}"
   - 目標カロリー: ${meal.target.calories}kcal
   - 目標タンパク質: ${meal.target.protein}g
   - 目標脂質: ${meal.target.fat}g
   - 目標炭水化物: ${meal.target.carbs}g${fixedInfo}${constraintInfo}`;
  }).join("\n");

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
