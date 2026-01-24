/**
 * FaveFit v2 - テストエージェントサービス
 * エージェントのテスト実行に関するビジネスロジック
 */

import { mastra } from "@/mastra";
import { buildRecipePrompt } from "@/mastra/agents/recipe-creator";
import { getOrCreateUser } from "@/lib/user";

export interface TestAgentRequest {
  agentId: string;
  input: unknown;
  userId: string | undefined;
}

/**
 * エージェントをテスト実行
 */
export async function testAgent(
  request: TestAgentRequest
): Promise<unknown> {
  const { agentId, input, userId } = request;

  let messageText = "";

  if (agentId === "recipe-creator") {
    // ユーザーの好みをFirestoreから取得
    let userDoc = null;
    if (userId) {
      try {
        userDoc = await getOrCreateUser(userId);
        console.log(
          `Fetched user document for user ${userId}:`,
          userDoc ? "Found" : "Not Found"
        );
      } catch (err) {
        console.error("Error fetching user document:", err);
      }
    }

    // プロンプトの構築
    const inputTyped = input as { mood?: string; targetNutrition?: unknown };
    if (!inputTyped.mood || !inputTyped.targetNutrition) {
      throw new Error("recipe-creatorエージェントにはmoodとtargetNutritionが必要です");
    }
    messageText = buildRecipePrompt(
      userDoc,
      inputTyped.mood,
      inputTyped.targetNutrition as {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
      }
    );
  } else {
    // デフォルトは nutrition-planner
    messageText = `以下の身体情報に基づいて栄養素目標を算出してJSONで答えてください:\n${JSON.stringify(input)}`;
  }

  const agent = mastra.getAgent(agentId === "recipe-creator" ? "recipeCreator" : "nutritionPlanner");

  const result = await agent.generate(messageText);

  // 構造化出力が有効な場合は直接取得、そうでない場合はJSONをパース
  if (result.text) {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : result.text;
    try {
      return JSON.parse(jsonString);
    } catch {
      console.error("Failed to parse JSON:", result.text);
      throw new Error("AI応答のパースに失敗しました");
    }
  } else if (result.object) {
    return result.object;
  } else {
    throw new Error("AI応答が無効です");
  }
}
