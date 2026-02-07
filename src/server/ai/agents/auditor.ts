import { generateObject } from "ai";
import { z } from "zod";
import { google } from "../config";
import { getTelemetryConfig } from "../observability";

/**
 * Auditorエージェントの出力スキーマ
 */
const AuditorOutputSchema = z.object({
// ... (omitted for brevity, keep the same)
  anchors: z.array(
    z.object({
      mealType: z.enum(["breakfast", "lunch", "dinner"]),
      resolvedTitle: z.string().describe("栄養素を推定した具体的なメニュー名"),
      estimatedNutrition: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbs: z.number(),
      }),
      reason: z.string().describe("推定の根拠や調整内容"),
    })
  ),
});

export type AuditorOutput = z.infer<typeof AuditorOutputSchema>;

/**
 * Auditorエージェントの実行
 * ユーザーの「固定メニュー」や「こだわり要望」を具体的な栄養素に変換します。
 */
export async function runAuditor(
  mealSettings: {
    breakfast: { mode: string; text: string };
    lunch: { mode: string; text: string };
    dinner: { mode: string; text: string };
  },
  dailyTarget: { calories: number; protein: number; fat: number; carbs: number },
  userId?: string,
  processName?: string
): Promise<AuditorOutput> {
  // 固定またはこだわりが設定されているスロットを抽出
  const inputs = Object.entries(mealSettings)
    .filter(([, setting]) => setting.mode !== "auto")
    .map(([key, setting]) => {
      const typeLabel = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" }[key as "breakfast" | "lunch" | "dinner"];
      const modeLabel = setting.mode === "fixed" ? "【固定メニュー】" : "【こだわり要望】";
      return `- ${typeLabel}: ${modeLabel} "${setting.text}"`;
    })
    .join("\n");

  // 何も指定がない場合は空で返す
  if (!inputs) {
    return { anchors: [] };
  }

  const prompt = `
あなたは栄養計算の専門家です。ユーザーの食事設定（固定メニューや要望）を分析し、
それぞれの食事の具体的な内容と栄養素（カロリー, P, F, C）を推定してください。

【1日の目標値（参考）】
総カロリー: ${dailyTarget.calories}kcal
(P: ${dailyTarget.protein}g, F: ${dailyTarget.fat}g, C: ${dailyTarget.carbs}g)

【分析対象】
${inputs}

【推定ルール】
1. 固定メニューの場合:
   - 料理名から一般的な栄養価を算出してください。
   - ユーザーが量や調理法を指定している場合（例：「ご飯100g」「油控えめ」）、それを反映して調整してください。
2. こだわり要望の場合:
   - 要望（例：「コンビニで500kcal以下」「さっぱりしたサラダ」）を満たす代表的なメニューを1つ仮定し、その栄養価を算出してください。
   - 具体的なカロリー指定がある場合は、その値を上限として設定してください。
3. 栄養素の整合性:
   - 明らかに異常な値（例：サラダで2000kcal）にならないよう、現実的な範囲で推定してください。

※理由（reason）には、どのように栄養価を見積もったか、または要望をどう解釈したかを簡潔に記載してください。
`;

  try {
    const result = await generateObject({
      model: google("gemini-1.5-flash"), 
      schema: AuditorOutputSchema,
      prompt,
      temperature: 0.3, // 決定論的な出力を重視
      experimental_telemetry: getTelemetryConfig({
        agentName: "auditor",
        userId,
        processName,
      }),
    });

    return result.object;
  } catch (error) {
    console.error("Auditor Agent Error:", error);
    // エラー時は空のアンカーを返して、後続の処理（AIによる全自動生成）に委ねる安全策
    return { anchors: [] };
  }
}