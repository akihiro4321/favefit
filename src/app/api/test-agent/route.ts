import { NextRequest, NextResponse } from 'next/server';
import { InMemoryRunner, stringifyContent } from '@google/adk';
import { nutritionPlannerAgent } from '@/lib/agents/nutrition-planner';
import { recipeCreatorAgent } from '@/lib/agents/recipe-creator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, input } = body;

    let agent;
    let messageText = '';

    if (agentId === 'recipe-creator') {
      agent = recipeCreatorAgent;
      messageText = `以下の「気分」と「目標栄養素」に基づいてレシピを1つ提案してください:\n気分: ${input.mood}\n目標: ${JSON.stringify(input.targetNutrition)}`;
    } else {
      // デフォルトは nutrition-planner
      agent = nutritionPlannerAgent;
      messageText = `以下の身体情報に基づいて栄養素目標を算出してJSONで答えてください:\n${JSON.stringify(input)}`;
    }

    const runner = new InMemoryRunner({
      agent,
      appName: 'FaveFit-Test',
    });

    const userId = 'test-user';
    const sessionId = `test-session-${agentId}`;

    await runner.sessionService.createSession({
      sessionId,
      userId,
      appName: 'FaveFit-Test',
      state: {},
    });

    const userMessage = {
      role: 'user',
      parts: [{ text: messageText }]
    };

    let fullText = '';
    const events = runner.runAsync({ userId, sessionId, newMessage: userMessage });

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