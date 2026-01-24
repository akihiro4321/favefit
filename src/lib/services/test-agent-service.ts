/**
 * FaveFit v2 - テストエージェントサービス
 * エージェントのテスト実行に関するビジネスロジック
 */

import { InMemoryRunner, stringifyContent } from "@google/adk";
import { nutritionPlannerAgent } from "@/lib/agents/nutrition-planner";
import { recipeCreatorAgent, buildRecipePrompt } from "@/lib/agents/recipe-creator";
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

  let agent;
  let messageText = "";

  if (agentId === "recipe-creator") {
    agent = recipeCreatorAgent;

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
    agent = nutritionPlannerAgent;
    messageText = `以下の身体情報に基づいて栄養素目標を算出してJSONで答えてください:\n${JSON.stringify(input)}`;
  }

  const runner = new InMemoryRunner({
    agent,
    appName: "FaveFit-Test",
  });

  // ADKのセッション管理用ID
  const sessionUserId = userId || "test-user";
  const sessionId = `test-session-${agentId}-${Date.now()}`;

  await runner.sessionService.createSession({
    sessionId,
    userId: sessionUserId,
    appName: "FaveFit-Test",
    state: {},
  });

  const userMessage = {
    role: "user",
    parts: [{ text: messageText }],
  };

  let fullText = "";
  const events = runner.runAsync({
    userId: sessionUserId,
    sessionId,
    newMessage: userMessage,
  });

  for await (const event of events) {
    const content = stringifyContent(event);
    if (content) fullText += content;
  }

  // AIの応答を抽出
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  const jsonString = jsonMatch ? jsonMatch[0] : fullText;

  try {
    return JSON.parse(jsonString);
  } catch {
    console.error("Failed to parse JSON:", fullText);
    throw new Error("AI応答のパースに失敗しました");
  }
}
