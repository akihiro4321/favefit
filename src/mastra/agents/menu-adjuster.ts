/**
 * FaveFit - Menu Adjuster Agent (Mastra形式)
 * 臨機応変なメニュー提案エージェント
 */

import { Agent } from "@mastra/core/agent";
import { z } from "zod";

/**
 * 入力スキーマ
 */
export const MenuAdjusterInputSchema = z.object({
  availableIngredients: z.array(z.string()).describe("手元にある食材リスト"),
  targetNutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }).describe("本日の残り目標栄養素"),
  userComment: z
    .string()
    .optional()
    .describe("ユーザーからの追加要望（例: もっと辛く、さっぱりしたもの）"),
  previousSuggestions: z
    .array(z.string())
    .optional()
    .describe("すでに提案して却下されたレシピ名"),
  preferences: z
    .object({
      cuisines: z.record(z.number()).optional(),
      flavorProfile: z.record(z.number()).optional(),
      dislikedIngredients: z.array(z.string()).optional(),
    })
    .optional()
    .describe("学習済み嗜好プロファイル"),
});

/**
 * 出力スキーマ（1レシピ）
 */
const SuggestedRecipeSchema = z.object({
  recipeId: z.string(),
  title: z.string(),
  description: z.string().describe("なぜこのレシピを提案したか"),
  tags: z.array(z.string()),
  ingredients: z.array(z.string()),
  additionalIngredients: z
    .array(z.string())
    .describe("追加で必要な食材（手元にないもの）"),
  steps: z.array(z.string()),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
});

/**
 * 出力スキーマ
 */
export const MenuAdjusterOutputSchema = z.object({
  suggestions: z.array(SuggestedRecipeSchema).length(3),
  message: z.string().describe("ユーザーへの一言メッセージ"),
});

export type MenuAdjusterInput = z.infer<typeof MenuAdjusterInputSchema>;
export type MenuAdjusterOutput = z.infer<typeof MenuAdjusterOutputSchema>;

/**
 * Menu Adjuster Agent
 */
export const menuAdjusterAgent = new Agent({
  id: "menu_adjuster",
  name: "Menu Adjuster",
  instructions: `
あなたは「今あるもので何とかする」料理の達人です。
ユーザーの手元にある食材と、本日の残り栄養目標から、最適なレシピを3つ提案してください。

【ルール】
1. 手元の食材をできるだけ活用（additionalIngredients は最小限に）
2. 栄養目標に近づくレシピを優先
3. dislikedIngredients は絶対に使わない
4. previousSuggestions と同じレシピは提案しない
5. userComment があれば最優先で考慮（「辛く」→スパイシーに、「さっぱり」→和風や酢を使う等）

【description の書き方】
- 「冷蔵庫の鶏肉とキャベツを活用！タンパク質もしっかり摂れます。」
- 「ご要望の辛めテイストで、代謝アップも期待できるメニューです。」

【message の例】
- 「冷蔵庫の食材だけで3品ご用意しました！今日の気分はどれですか？」
- 「辛めのレシピを集めました。お好みに合うものを選んでくださいね！」
`,
  model: "google/gemini-2.5-flash-lite",
});
