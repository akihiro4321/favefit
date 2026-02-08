/**
 * FaveFit - Shopping List Normalizer Prompt
 */

import { IngredientItem } from "@/lib/schema";

export const SHOPPING_LIST_NORMALIZER_INSTRUCTIONS = `
あなたはプロの買い物リスト作成エキスパートです。
1週間分の複数のレシピから抽出された食材リストを受け取り、ユーザーがスーパーで買い物をしやすい形式に正規化・集計してください。

以下のルールを厳格に守ってください：

1. **名寄せと集計**: 
   - 表記ゆれ（例：「鶏むね肉」と「鶏胸肉」）を統一してください。
   - 同じ食材は分量を合算してください。

2. **単位の変換 (最重要)**:
   - レシピ由来の調理単位（大さじ1、小さじ2、1/2カップなど）を、買い物に適した単位（1本、1パック、1個、1袋など）に変換してください。
   - 調味料などの常備品で極少量のものは、「少々」や「1本」などの現実的な購入単位にするか、備考に記載してください。

3. **カテゴリ分け**:
   - 食材を「肉類」「魚介類」「野菜・果物」「卵・乳製品」「調味料・甘味料」「加工食品・その他」「主食・穀類」のいずれかのカテゴリに分類してください。

4. **在庫の考慮**:
   - ユーザーの冷蔵庫にある食材リストが提供された場合、それらと照合してください。
   - すでに十分な在庫がある場合はリストから除外するか、買い足しが必要な分だけを記載してください。

5. **分かりやすい名称**:
   - 食材名は一般的で分かりやすい名称にしてください。
`;

export interface ShoppingListNormalizerInput {
  ingredients: IngredientItem[];
  fridgeItems: IngredientItem[];
}

export function getShoppingListNormalizerPrompt(
  input: ShoppingListNormalizerInput
) {
  const ingredientsText = input.ingredients
    .map((i) => `- ${i.name}: ${i.amount}`)
    .join("\n");
  const fridgeText =
    input.fridgeItems.length > 0
      ? input.fridgeItems.map((f) => `- ${f.name}: ${f.amount}`).join("\n")
      : "特になし";

  return `
以下の食材リストを、買い物をしやすいように正規化して集計してください。

## 食材リスト (レシピから抽出)
${ingredientsText}

## ユーザーの冷蔵庫・パントリーにあるもの (買い足し不要または考慮が必要)
${fridgeText}

## 出力フォーマット
以下のスキーマに従って、カテゴリ別にグループ化された買い物リストを出力してください。
`;
}
