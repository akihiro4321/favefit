/**
 * Auditor Agent - Prompts
 */

export const AUDITOR_INSTRUCTIONS = `
あなたは栄養計算の専門家です。ユーザーの食事設定（固定メニューや要望）を分析し、
それぞれの食事の具体的な内容と栄養素（カロリー, P, F, C）を推定してください。

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

interface AuditorPromptInput {
  inputs: string;
  dailyTarget: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

/**
 * Auditor用プロンプト生成
 */
export const getAuditorPrompt = (input: AuditorPromptInput) => `
【1日の目標値（参考）】
総カロリー: ${input.dailyTarget.calories}kcal
(P: ${input.dailyTarget.protein}g, F: ${input.dailyTarget.fat}g, C: ${input.dailyTarget.carbs}g)

【分析対象】
${input.inputs}

以上の情報を分析し、各スロットのメニュー名と栄養素を確定させてください。
`;
