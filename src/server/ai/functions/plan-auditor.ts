import { z } from "zod";
import { callModelWithSchema } from "../utils/agent-helpers";
import {
  AUDITOR_INSTRUCTIONS,
  getAuditorPrompt,
} from "../prompts/functions/plan-auditor";
import { GEMINI_2_5_FLASH_MODEL } from "../config";

/**
 * Plan Auditor 関数の出力スキーマ
 */
const AuditorOutputSchema = z.object({
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
    }),
  ),
});

export type AuditorOutput = z.infer<typeof AuditorOutputSchema>;

/**
 * Plan Auditor を実行
 * ユーザーの「固定メニュー」や「こだわり要望」を具体的な栄養素に変換します。
 */
export async function auditPlanAnchors(
  mealSettings: {
    breakfast: { mode: string; text: string };
    lunch: { mode: string; text: string };
    dinner: { mode: string; text: string };
  },
  dailyTarget: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  },
): Promise<AuditorOutput> {
  // 固定またはこだわりが設定されているスロットを抽出
  const inputs = Object.entries(mealSettings)
    .filter(([, setting]) => setting.mode !== "auto" && setting.text)
    .map(([key, setting]) => {
      const typeLabel = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" }[
        key as "breakfast" | "lunch" | "dinner"
      ];
      const modeLabel =
        setting.mode === "fixed" ? "【固定メニュー】" : "【こだわり要望】";
      return `- ${typeLabel}: ${modeLabel} "${setting.text}"`;
    })
    .join("\n");

  // 何も指定がない場合は空で返す
  if (!inputs) {
    return { anchors: [] };
  }

  try {
    return await callModelWithSchema(
      AUDITOR_INSTRUCTIONS,
      getAuditorPrompt({ inputs, dailyTarget }),
      AuditorOutputSchema,
      GEMINI_2_5_FLASH_MODEL,
    );
  } catch (error) {
    console.error("Plan Auditor Error:", error);
    // エラー時は空のアンカーを返して、後続の処理（AIによる全自動生成）に委ねる安全策
    return { anchors: [] };
  }
}
