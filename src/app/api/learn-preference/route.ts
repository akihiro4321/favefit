import { NextRequest, NextResponse } from "next/server";
import { InMemoryRunner, stringifyContent } from "@google/adk";
import {
  preferenceLearnerAgent,
  PreferenceAnalysis,
} from "@/lib/agents/preference-learner";
import { updateLearnedPreferences } from "@/lib/user";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { userId, recipeId, feedback } = await req.json();

    if (!userId || !recipeId || !feedback) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. レシピ情報の取得 (recipeHistory コレクションから)
    const recipeRef = doc(db, "recipeHistory", userId, "recipes", recipeId);
    const recipeSnap = await getDoc(recipeRef);

    if (!recipeSnap.exists()) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipe = recipeSnap.data();

    // 2. Agentの実行
    const runner = new InMemoryRunner({
      agent: preferenceLearnerAgent,
      appName: "FaveFit-Learner",
    });

    const sessionId = `learner-${userId}-${Date.now()}`;
    await runner.sessionService.createSession({
      sessionId,
      userId,
      appName: "FaveFit-Learner",
      state: {},
    });

    const messageText = `
【分析対象データ】
■ レシピ
タイトル: ${recipe.title}
タグ: ${JSON.stringify(recipe.tags || [])}
材料: ${JSON.stringify(recipe.ingredients || [])}

■ ユーザーフィードバック
また作りたいか: ${feedback.wantToMakeAgain ? "はい" : "いいえ"}
コメント: "${feedback.comment || "なし"}"
`;

    const userMessage = {
      role: "user",
      parts: [{ text: messageText }],
    };

    let fullText = "";
    const events = runner.runAsync({
      userId,
      sessionId,
      newMessage: userMessage,
    });

    for await (const event of events) {
      const content = stringifyContent(event);
      if (content) fullText += content;
    }

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : fullText;
    const analysis: PreferenceAnalysis = JSON.parse(jsonString);

    // 3. プロファイルの更新 (learnedPreferences フィールドを更新)
    await updateLearnedPreferences(
      userId,
      analysis.cuisineUpdates,
      analysis.flavorUpdates
    );

    return NextResponse.json({ success: true, analysis });
  } catch (error: unknown) {
    console.error("Learning error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
