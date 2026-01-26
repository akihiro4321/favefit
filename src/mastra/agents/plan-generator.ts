/**
 * FaveFit - Plan Generator Agent (Mastra形式)
 * 14日間プラン生成エージェント
 */

import { Agent } from "@mastra/core/agent";
import { z } from "zod";

/**
 * 入力スキーマ
 */
/**
 * 各食事の目標栄養素スキーマ
 */
const NutritionValuesSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
});

export const PlanGeneratorInputSchema = z.object({
  targetCalories: z.number().describe("1日の目標カロリー"),
  pfc: z.object({
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
  mealTargets: z
    .object({
      breakfast: NutritionValuesSchema.describe("朝食の目標栄養素（20%）"),
      lunch: NutritionValuesSchema.describe("昼食の目標栄養素（40%）"),
      dinner: NutritionValuesSchema.describe("夕食の目標栄養素（40%）"),
    })
    .optional()
    .describe("各食事の目標栄養素（事前計算済み）"),
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
/**
 * 単一食事のスキーマ（食事の再生成用）
 */
export const SingleMealSchema = z.object({
  recipeId: z.string().describe("ユニークなレシピID"),
  title: z.string().describe("レシピ名"),
  tags: z.array(z.string()).describe("タグ（和食、洋食など）"),
  ingredients: z.array(z.string()).describe("材料リスト（「材料名: 分量」形式）"),
  steps: z.array(z.string()).describe("調理手順"),
  nutrition: z.object({
    calories: z.number().describe("カロリー (kcal)"),
    protein: z.number().describe("タンパク質 (g)"),
    fat: z.number().describe("脂質 (g)"),
    carbs: z.number().describe("炭水化物 (g)"),
  }),
});

export const PartialPlanOutputSchema = z.object({
  days: z.array(
    z.object({
      date: z.string().describe("日付 (YYYY-MM-DD)"),
      isCheatDay: z.boolean().describe("チートデイかどうか"),
      breakfast: SingleMealSchema,
      lunch: SingleMealSchema,
      dinner: SingleMealSchema,
    })
  ),
});

export type PlanGeneratorInput = z.infer<typeof PlanGeneratorInputSchema>;
export type PlanGeneratorOutput = z.infer<typeof PlanGeneratorOutputSchema>;

import { PromptService } from "@/lib/services/prompt-service";

/**
 * Plan Generator Agent
 */
export const planGeneratorAgent = new Agent({
  id: "plan_generator",
  name: "Plan Generator",
  instructions: async () => {
    return PromptService.getInstance().getInstructions("plan_generator");
  },
  model: "google/gemini-2.5-flash-lite",
});
