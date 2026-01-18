import { NextRequest, NextResponse } from 'next/server';
import { InMemoryRunner, stringifyContent } from '@google/adk';
import { nutritionPlannerAgent, NutritionInputSchema, NutritionOutputSchema } from '@/lib/agents/nutrition-planner';

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
    let parsedData: any;
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : fullText;
      const rawJson = JSON.parse(jsonString);

      // ここで NutritionOutputSchema に合わせて変換・バリデーション
      // もし Gemini が以前のようにネストしてきても、ここでフラットに変換できる
      parsedData = {
        daily_calorie_target: rawJson.daily_calorie_target || rawJson.daily_targets?.calories?.value || 0,
        protein_g: rawJson.protein_g || rawJson.daily_targets?.protein?.value || 0,
        fat_g: rawJson.fat_g || rawJson.daily_targets?.fat?.value || 0,
        carbs_g: rawJson.carbs_g || rawJson.daily_targets?.carbohydrates?.value || 0,
        strategy_summary: rawJson.strategy_summary || rawJson.notes || '算出されました。',
      };

      // 最終的なスキーマチェック
      parsedData = NutritionOutputSchema.parse(parsedData);
    } catch (e) {
      console.error('Failed to parse or validate JSON:', fullText);
      throw new Error('AIの回答形式が不正です。もう一度お試しください。');
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Agent execution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
