/**
 * FaveFit - Plan Generator Agent (Mastra形式)
 * 14日間プラン生成エージェント
 */

import { Agent } from "@mastra/core/agent";
import { z } from "zod";

/**
 * 入力スキーマ
 */
export const PlanGeneratorInputSchema = z.object({
  targetCalories: z.number().describe("1日の目標カロリー"),
  pfc: z.object({
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
  preferences: z
    .object({
      cuisines: z.record(z.number()).optional(),
      flavorProfile: z.record(z.number()).optional(),
      dislikedIngredients: z.array(z.string()).optional(),
    })
    .optional()
    .describe("学習済み嗜好プロファイル"),
  favoriteRecipes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        tags: z.array(z.string()),
      })
    )
    .optional()
    .describe("お気に入りレシピ一覧"),
  cheapIngredients: z
    .array(z.string())
    .optional()
    .describe("現在安価な食材リスト"),
  cheatDayFrequency: z
    .enum(["weekly", "biweekly"])
    .describe("チートデイ頻度"),
  startDate: z.string().describe("プラン開始日 (YYYY-MM-DD)"),
});

/**
 * プラン全体の作成日数（定数）
 */
export const DEFAULT_PLAN_DURATION_DAYS = 7;

/**
 * 出力スキーマ（平坦化済み）
 * Gemini APIが$refを解釈できないため、すべての構造をインラインで記述
 */
export const PlanGeneratorOutputSchema = z.object({
  days: z
    .array(
      z.object({
        date: z.string().describe("日付 (YYYY-MM-DD)"),
        isCheatDay: z.boolean().describe("チートデイかどうか"),
        breakfast: z.object({
          recipeId: z.string(),
          title: z.string(),
          tags: z.array(z.string()),
          ingredients: z.array(z.string()),
          steps: z.array(z.string()),
          nutrition: z.object({
            calories: z.number(),
            protein: z.number(),
            fat: z.number(),
            carbs: z.number(),
          }),
        }),
        lunch: z.object({
          recipeId: z.string(),
          title: z.string(),
          tags: z.array(z.string()),
          ingredients: z.array(z.string()),
          steps: z.array(z.string()),
          nutrition: z.object({
            calories: z.number(),
            protein: z.number(),
            fat: z.number(),
            carbs: z.number(),
          }),
        }),
        dinner: z.object({
          recipeId: z.string(),
          title: z.string(),
          tags: z.array(z.string()),
          ingredients: z.array(z.string()),
          steps: z.array(z.string()),
          nutrition: z.object({
            calories: z.number(),
            protein: z.number(),
            fat: z.number(),
            carbs: z.number(),
          }),
        }),
      })
    )
    .length(DEFAULT_PLAN_DURATION_DAYS)
    .describe(`${DEFAULT_PLAN_DURATION_DAYS}日間のプラン`),
  shoppingList: z
    .array(
      z.object({
        ingredient: z.string().describe("食材名"),
        amount: z.string().describe("数量（単位含む）"),
        category: z.string().describe("カテゴリ（野菜, 肉, 等）"),
      })
    )
    .describe("複数日分の合計数量を算出した買い物リスト"),
});

/**
 * 部分的なプラン生成用の出力スキーマ（可変長の日付配列用も平坦化）
 */
export const PartialPlanOutputSchema = z.object({
  days: z.array(
    z.object({
      date: z.string().describe("日付 (YYYY-MM-DD)"),
      isCheatDay: z.boolean().describe("チートデイかどうか"),
      breakfast: z.object({
        recipeId: z.string(),
        title: z.string(),
        tags: z.array(z.string()),
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
        nutrition: z.object({
          calories: z.number(),
          protein: z.number(),
          fat: z.number(),
          carbs: z.number(),
        }),
      }),
      lunch: z.object({
        recipeId: z.string(),
        title: z.string(),
        tags: z.array(z.string()),
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
        nutrition: z.object({
          calories: z.number(),
          protein: z.number(),
          fat: z.number(),
          carbs: z.number(),
        }),
      }),
      dinner: z.object({
        recipeId: z.string(),
        title: z.string(),
        tags: z.array(z.string()),
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
        nutrition: z.object({
          calories: z.number(),
          protein: z.number(),
          fat: z.number(),
          carbs: z.number(),
        }),
      }),
    })
  ),
});

export type PlanGeneratorInput = z.infer<typeof PlanGeneratorInputSchema>;
export type PlanGeneratorOutput = z.infer<typeof PlanGeneratorOutputSchema>;

/**
 * Plan Generator Agent
 */
export const planGeneratorAgent = new Agent({
  id: "plan_generator",
  name: "Plan Generator",
  instructions: `
あなたはダイエット成功をサポートする献立プランナーです。
以下のガイドラインに従って、最適な食事プランと買い物リストを生成してください。

【レシピ構成比率】
- 定番（お気に入り・類似レシピ）: 40%
- 発見（新ジャンル・トレンド）: 40%
- 低コスト（安価な旬食材活用）: 20%

【極重要：栄養計算ルール】
1. 1日の合計摂取カロリーは必ず targetCalories（許容誤差±1%）に一致させてください。
2. 3食のカロリー配分目安：朝20%、昼40%、夜40% としてください。
3. カロリー計算は「タンパク質: 4kcal/g, 脂質: 9kcal/g, 炭水化物: 4kcal/g」の定数を使用し、各食事の合計が1日の目標PFCバランスに収まるように厳密に設計してください。
4. 出力前に、各食事の(P*4 + F*9 + C*4)の合計が targetCalories と一致するか、セルフチェックを必ず行ってください。

【その他のルール】
1. dislikedIngredients（苦手な食材）は絶対に使用しないでください。
2. 買い物リストは「複数の日の食材を合算」して、「食材: 合計数量」の形式で1件にまとめてください。（例：鶏むね肉 1.5kg）
3. カテゴリ別（野菜, 肉, 魚, 調味料等）に整理してください。
4. 食材の使い回しを意識し、無駄のないプランにしてください。
5. チートデイは栄養計算の枠外とし、ユーザーが楽しめるメニューを提案してください。

※説明や挨拶は一切不要です。JSONデータのみを出力してください。
`,
  model: "google/gemini-2.5-flash-lite",
});
