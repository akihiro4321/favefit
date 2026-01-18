import { NextRequest, NextResponse } from 'next/server';
import { InMemoryRunner, stringifyContent } from '@google/adk';
import { nutritionPlannerAgent } from '@/lib/agents/nutrition-planner';
import { recipeCreatorAgent, buildRecipePrompt } from '@/lib/agents/recipe-creator';
import { getPreference } from '@/lib/preference';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, input, userId } = body;

    let agent;
    let messageText = '';

    if (agentId === 'recipe-creator') {
      agent = recipeCreatorAgent;
      
      // ユーザーの好みをFirestoreから取得
      let preference = null;
      if (userId) {
        try {
          preference = await getPreference(userId);
          console.log(`Fetched preference for user ${userId}:`, preference ? 'Found' : 'Not Found');
        } catch (err) {
          console.error('Error fetching preference:', err);
        }
      }

      // プロンプトの構築
      messageText = buildRecipePrompt(preference, input.mood, input.targetNutrition);
      
    } else {
      // デフォルトは nutrition-planner
      agent = nutritionPlannerAgent;
      messageText = `以下の身体情報に基づいて栄養素目標を算出してJSONで答えてください:\n${JSON.stringify(input)}`;
    }

    const runner = new InMemoryRunner({
      agent,
      appName: 'FaveFit-Test',
    });

    // ADKのセッション管理用ID
    const sessionUserId = userId || 'test-user';
    const sessionId = `test-session-${agentId}-${Date.now()}`;

    await runner.sessionService.createSession({
      sessionId,
      userId: sessionUserId,
      appName: 'FaveFit-Test',
      state: {},
    });

    const userMessage = {
      role: 'user',
      parts: [{ text: messageText }]
    };

    let fullText = '';
    const events = runner.runAsync({ userId: sessionUserId, sessionId, newMessage: userMessage });

    for await (const event of events) {
      const content = stringifyContent(event);
      if (content) fullText += content;
    }

    // AIの応答を抽出
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : fullText;
    
    try {
      const parsedData = JSON.parse(jsonString);
      return NextResponse.json(parsedData);
    } catch {
      console.error('Failed to parse JSON:', fullText);
      return NextResponse.json({ error: 'Failed to parse AI response', raw: fullText }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Agent execution error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
