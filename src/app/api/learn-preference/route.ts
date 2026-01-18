import { NextRequest, NextResponse } from 'next/server';
import { InMemoryRunner, stringifyContent } from '@google/adk';
import { preferenceLearnerAgent, PreferenceAnalysis } from '@/lib/agents/preference-learner';
import { getPreference, updatePreference } from '@/lib/preference';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { userId, feedbackId, recipeId } = await req.json();

    if (!userId || !feedbackId || !recipeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. レシピとフィードバックの取得
    const recipeRef = doc(db, 'users', userId, 'recipes', recipeId);
    const feedbackRef = doc(db, 'users', userId, 'feedbacks', feedbackId);
    
    const [recipeSnap, feedbackSnap] = await Promise.all([
      getDoc(recipeRef),
      getDoc(feedbackRef)
    ]);

    if (!recipeSnap.exists() || !feedbackSnap.exists()) {
      return NextResponse.json({ error: 'Recipe or Feedback not found' }, { status: 404 });
    }

    const recipe = recipeSnap.data();
    const feedback = feedbackSnap.data();

    // 2. Agentの実行
    const runner = new InMemoryRunner({
      agent: preferenceLearnerAgent,
      appName: 'FaveFit-Learner',
    });

    const sessionId = `learner-${userId}-${Date.now()}`;
    await runner.sessionService.createSession({
      sessionId,
      userId,
      appName: 'FaveFit-Learner',
      state: {},
    });

    const messageText = `
【分析対象データ】
■ レシピ
タイトル: ${recipe.title}
説明: ${recipe.description}
材料: ${JSON.stringify(recipe.ingredients)}
栄養: ${JSON.stringify(recipe.nutrition)}

■ ユーザーフィードバック
総合評価: ${feedback.ratings.overall}/5
味: ${feedback.ratings.taste}/5
作りやすさ: ${feedback.ratings.ease}/5
満足感: ${feedback.ratings.satisfaction}/5
コメント: "${feedback.comment || 'なし'}"
`;

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

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : fullText;
    const analysis: PreferenceAnalysis = JSON.parse(jsonString);

    // 3. プロファイルの更新
    const currentPref = await getPreference(userId);
    if (!currentPref) throw new Error('Failed to get user preference');

    const learned = { ...currentPref.learnedProfile };

    // スコアの更新 (単純加算)
    const updateScores = (current: Record<string, number>, deltas: Record<string, number>) => {
      const next = { ...current };
      Object.entries(deltas).forEach(([key, delta]) => {
        next[key] = (next[key] || 0) + delta;
      });
      return next;
    };

    learned.preferredCuisines = updateScores(learned.preferredCuisines, analysis.extractedPreferences.cuisines);
    learned.preferredFlavors = updateScores(learned.preferredFlavors, analysis.extractedPreferences.flavors);
    learned.preferredIngredients = updateScores(learned.preferredIngredients, analysis.extractedPreferences.ingredients);
    learned.totalFeedbacks = (learned.totalFeedbacks || 0) + 1;

    // 4. 保存
    await updatePreference(userId, { learnedProfile: learned });
    
    // フィードバックにも分析結果を保存
    await updateDoc(feedbackRef, {
      analyzedTags: {
        positiveTags: analysis.positiveTags,
        negativeTags: analysis.negativeTags,
        extractedPreferences: Object.keys(analysis.extractedPreferences.flavors) // 簡易的にフレーバーを入れる
      }
    });

    return NextResponse.json({ success: true, analysis });

  } catch (error: unknown) {
    console.error('Learning error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
