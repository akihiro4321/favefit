import { NextRequest, NextResponse } from 'next/server';
import { InMemoryRunner, stringifyContent } from '@google/adk';
import { nutritionPlannerAgent, NutritionInputSchema, NutritionOutputSchema, NutritionOutput } from '@/lib/agents/nutrition-planner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 入力のバリデーション
    const input = NutritionInputSchema.parse(body);

    // エージェントの実行
    const runner = new InMemoryRunner({
      agent: nutritionPlannerAgent,
      appName: 'FaveFit-Test',
    });

    const userId = 'test-user';
    const sessionId = 'test-session';

    await runner.sessionService.createSession({
      sessionId,
      userId,
      appName: 'FaveFit-Test',
      state: {},
    });

    const userMessage = {
      role: 'user',
      parts: [{ text: `以下の身体情報に基づいて栄養素目標を算出してJSONで答えてください:\n${JSON.stringify(input)}` }]
    };

    let fullText = '';
    const events = runner.runAsync({ userId, sessionId, newMessage: userMessage });

    for await (const event of events) {
      const content = stringifyContent(event);
      if (content) fullText += content;
    }

    // AIの応答を抽出・パース
    let parsedData: NutritionOutput;
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : fullText;
      const rawJson = JSON.parse(jsonString) as Record<string, unknown>;

      // ここで NutritionOutputSchema に合わせて変換・バリデーション
      // もし Gemini が以前のようにネストしてきても、ここでフラットに変換できる
      const dailyTargets = rawJson.daily_targets as Record<string, Record<string, number | string>> | undefined;

      const flattenedData = {
        daily_calorie_target: (rawJson.daily_calorie_target as number) || (dailyTargets?.calories?.value as number) || 0,
        protein_g: (rawJson.protein_g as number) || (dailyTargets?.protein?.value as number) || 0,
        fat_g: (rawJson.fat_g as number) || (dailyTargets?.fat?.value as number) || 0,
        carbs_g: (rawJson.carbs_g as number) || (dailyTargets?.carbohydrates?.value as number) || 0,
        strategy_summary: (rawJson.strategy_summary as string) || (rawJson.notes as string) || '算出されました。',
      };

      // 最終的なスキーマチェック
      parsedData = NutritionOutputSchema.parse(flattenedData);
    } catch {
      console.error('Failed to parse or validate JSON:', fullText);
      throw new Error('AIの回答形式が不正です。もう一度お試しください。');
    }

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error('Agent execution error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
