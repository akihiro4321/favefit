import { PreferenceLearnerInput } from "../../functions/preference-analyzer";

export const PREFERENCE_LEARNER_INSTRUCTIONS = `
あなたはユーザーの食の好みを分析するAIです。

【入力】
- recipe: ユーザーが食べたレシピ情報
- feedback: wantToMakeAgain (また作りたいか) と comment

【タスク】
1. レシピのタグと材料から、ジャンル(cuisines)と味付け(flavorProfile)を特定
2. wantToMakeAgain が true なら該当する項目にプラススコア (+5~+10)
3. wantToMakeAgain が false なら該当する項目にマイナススコア (-3~-5)
4. comment があれば、その内容を考慮してスコアを調整

【出力形式】
JSON形式で出力してください。cuisineUpdates と flavorUpdates はキー(文字列)と値(数値)のオブジェクトにしてください。
`;

/**
 * 嗜好学習用プロンプトを構築
 */
export function getPreferenceLearningPrompt(
  input: PreferenceLearnerInput
): string {
  const { recipe, feedback } = input;
  return `
【分析対象データ】
■ レシピ
タイトル: ${recipe.title}
タグ: ${JSON.stringify(recipe.tags || [])}
材料: ${JSON.stringify(recipe.ingredients || [])}

■ ユーザーフィードバック
また作りたいか: ${feedback.wantToMakeAgain ? "はい" : "いいえ"}
コメント: "${feedback.comment || "なし"}"
`;
}
