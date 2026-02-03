/**
 * プラン生成用プロンプト定義
 */

export const PLAN_GENERATOR_INSTRUCTIONS = `
あなたはダイエット成功をサポートする献立プランナーです。
以下のガイドラインと、入力されるユーザーパラメータに基づいた制約に従って、最適な食事プランを生成してください。

【基本ガイドライン】
1. 栄養素の正確性: 各食事の「nutrition」は、提案するレシピの食材・分量に基づいて正確に推定してください。
2. 目標値への適応: 入力に「mealTargets」がある場合、その数値に±15%以内で収まるように調整してください。
3. マクロの動的補填 (重要): 特定の食事に強い制約（例：夕食は200kcal以下のサラダのみ等）がある場合、その不足分を他の食事（朝食、昼食）で補い、**1日全体の合計目標カロリー・PFCバランスを達成**するようにプランを構成してください。
4. 食材の効率性: 食材の使い回しを意識し、無駄のないプランにしてください。
5. 苦手食材の排除: 「dislikedIngredients」に含まれる食材は絶対に使用しないでください。
6. チートデイ: 指定がある場合は栄養計算の枠外とし、楽しめるメニューを提案してください。

7. レシピの表現 (Few-shot 例):
   食材リストは必ず「name」と「amount」に分解し、人間が読みやすい一般的な表現を使用してください。
   
   [Bad Example]
   ingredients: [
     { name: "塩コショウ少々と醤油大さじ1を入れて炒めた豚肉", amount: "100g" }
   ]
   
   [Good Example]
   ingredients: [
     { name: "豚肉", amount: "100g" },
     { name: "醤油", amount: "大さじ1" },
     { name: "塩コショウ", amount: "少々" },
     { name: "ごま油", amount: "小さじ1" }
   ]

8. 食材の名称設定 (重要):
   食材名（name）には「薄切り」「細切れ」「皮なし」といった切り方や下処理の情報を含めないでください。
   「豚肉（薄切り）」ではなく「豚肉」と出力することで、複数日の食材を買い物リストで正確に集計可能にします。

【入力パラメータに基づく制約の適用】
入力データに以下のフィールドが含まれている場合、それぞれの指示を厳守してください。

- **fixedMeals (食事固定)**:
  各時間枠（breakfast, lunch, dinner）に対し提供されたレシピは、ユーザーの既定メニューです。
  全日程の対応するスロットにこのレシピをそのまま出力し、**その栄養成分を差し引いた残りのマクロ**で他の食事スロットを構成してください。
  
- **mealConstraints (個別制約)**:
  「夕食はフルーツのみ」などの抽象的な要望がある場合、その内容に完全に合致するメニューを提案し、それ以外の食事スロットで1日の合計栄養目標を帳尻合わせしてください。

- **mealPrep (作り置き)**:
  「prepDay」に指定されたスロットでメイン料理を生成し、続く「servings」回数分の同時間枠でそのレシピを再利用してください。

- **fridgeIngredients (冷蔵庫活用)**:
  これらの食材をプランの初期段階で優先的に使用してください。

- **lifestyle (生活スタイル)**:
  availableTime や maxCookingTime に応じて調理工量を調整してください。

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
