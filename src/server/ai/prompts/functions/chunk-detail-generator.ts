import { DailySkeleton, IngredientPool } from "../../types/plan-v2";
import { NutritionValues } from "../../types/common";

export const CHUNK_DETAIL_GENERATOR_INSTRUCTIONS = `あなたはプロの管理栄養士兼シェフです。
指定された期間（チャンク）の献立について、詳細なレシピ（分量と手順）を作成してください。

### 最重要ミッション: 「食材の使い切り」
この期間に割り当てられた「食材プール」の食材を、期間内の食事全体で無駄なく使い切るように、各食事の分量を調整してください。
- 例: キャベツ1玉がプールにある場合、Day1の夕食で1/4、Day2の昼食で1/4、Day3の夕食で1/2を使うなど、全体で1になるように配分する。
- 余らせたり、足りなくなったりしないように、全体を見通して分量を決定してください。

### ガイドライン
1. **メニュー名の固定**: スケルトンで指定されたメニュー名をそのまま使用してください。
2. **精密な栄養計算**: 各日の目標PFCバランスにできるだけ近づけてください。
3. **現実的なレシピ**: 一般的な家庭で15-30分で作れる手順にしてください。
4. **出力形式**: 指定されたJSONスキーマに従い、期間内のすべての日・すべての食事の詳細を出力してください。
`;

export interface ChunkDetailPromptInput {
  pool: IngredientPool;
  days: {
    date: string;
    meals: DailySkeleton["meals"];
    targets: {
      breakfast: NutritionValues;
      lunch: NutritionValues;
      dinner: NutritionValues;
      snack?: NutritionValues;
    };
  }[];
}

export function getChunkDetailPrompt(input: ChunkDetailPromptInput) {
  const daysInfo = input.days.map(d => {
    const snackInfo = d.meals.snack 
      ? `- 間食: "${d.meals.snack.title}" (目標: ${JSON.stringify(d.targets.snack)})` 
      : "";
    return `
【${d.date}】
- 朝食: "${d.meals.breakfast.title}" (目標: ${JSON.stringify(d.targets.breakfast)})
- 昼食: "${d.meals.lunch.title}" (目標: ${JSON.stringify(d.targets.lunch)})
- 夕食: "${d.meals.dinner.title}" (目標: ${JSON.stringify(d.targets.dinner)})
${snackInfo}
`;
  }).join("\n");

  return `
【対象期間と戦略】
期間: ${input.pool.period}
戦略: ${input.pool.strategy}

【この期間で使い切るべき食材プール】
${input.pool.ingredients.join(", ")}

【作成する献立リスト】
${daysInfo}

上記の全ての食事について、食材プールを効率的に配分し、詳細レシピを作成してください。
`;
}