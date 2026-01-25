/**
 * Plan Generator Agent テスト用ワークフロー
 * plan-service.ts:250-257 の構造化出力処理を忠実に再現
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
// import { PlanGeneratorOutputSchema } from "../agents/plan-generator";

// MealSchema などの変数を外に出さず、一つの巨大なオブジェクトとして定義する
export const PlanGeneratorOutputSchema = z.object({
  days: z.array(z.object({
    date: z.string().describe("YYYY-MM-DD形式の日付"),
    isCheatDay: z.boolean(),
    breakfast: z.object({
      recipeId: z.string(),
      title: z.string(),
      tags: z.array(z.string()),
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
      nutrition: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbs: z.number(),
      }),
    }),
  })).length(7).describe("7日間の献立リスト"),
  shoppingList: z.array(z.object({
    ingredient: z.string().describe("食材名（例: 鶏むね肉）"),
    amount: z.string().describe("合計数量（例: 1.2kg, 3パック）"),
    category: z.string().describe("売り場カテゴリ（例: 肉類, 野菜）"),
  })).describe("7日間で必要な食材の重複なしリスト"),
});

/**
 * Plan Generator Agent実行ステップ
 * plan-service.ts:236-286 の処理を忠実に再現
 * 
 * 注意: エージェントを一度取得してから使用することで、
 * 実行時間の差を最小限に抑える
 */
const planGeneratorStep = createStep({
  id: "plan_generator",
  description: "Plan Generator Agentを実行",
  inputSchema: z.object({
    text: z.string().describe("指示文（例: 以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。）"),
    json: z.any().describe("ユーザー情報のJSONデータ"),
  }),
  outputSchema: z.any().describe("Plan Generator Agentの出力"),
  execute: async ({ inputData, mastra }) => {
    // plan-service.ts:236 と同じパターン: エージェントを一度取得
    const agent = mastra.getAgent("planGenerator");

    // textとjsonを組み合わせてmessageTextを生成
    // plan-generator-test.mdの140-170行目の構造を再現
    const messageText = `${inputData.text}

【ユーザー情報】
${JSON.stringify(inputData.json, null, 2)}`;

    // plan-service.ts:250-257 の構造化出力処理を忠実に再現
    const result = await agent.generate(messageText, {
      structuredOutput: {
        schema: PlanGeneratorOutputSchema,
      },
    });
    // const result = await agent.generate(messageText);

    return result.object;
    // return result.text;
  },
});

/**
 * Plan Generator テストワークフロー
 * plan-service.ts:250-257 の処理を忠実に再現
 * 
 * 使用方法:
 * Mastra Studioでこのワークフローを選択し、
 * 入力として { text: string, json: object } を渡す
 * 
 * 例:
 * {
 *   "text": "以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。",
 *   "json": {
 *     "targetCalories": 1500,
 *     "pfc": { "protein": 150, "fat": 40, "carbs": 120 },
 *     ...
 *   }
 * }
 */
export const testPlanGeneratorWorkflow = createWorkflow({
  id: "test_plan_generator",
  inputSchema: z.object({
    text: z.string().describe("指示文"),
    json: z.any().describe("ユーザー情報のJSONデータ"),
  }),
  outputSchema: z.any().describe("Plan Generator Agentの出力"),
})
  .then(planGeneratorStep)
  .commit();
