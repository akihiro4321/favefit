/**
 * FaveFit - Shopping List Normalizer Function
 */

import { z } from "zod";
import { callModelWithSchema } from "../utils/agent-helpers";
import {
  SHOPPING_LIST_NORMALIZER_INSTRUCTIONS,
  getShoppingListNormalizerPrompt,
  ShoppingListNormalizerInput,
} from "../prompts/functions/shopping-list-normalizer";
import { GEMINI_3_FLASH_MODEL } from "../config";

/**
 * 出力スキーマ
 */
export const NormalizedShoppingListSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().describe("カテゴリ名（肉類、野菜類など）"),
      items: z.array(
        z.object({
          name: z.string().describe("食材名"),
          amount: z
            .string()
            .describe("購入単位での分量（例: 1パック, 2個, 1本）"),
          note: z.string().optional().describe("補足事項"),
        })
      ),
    })
  ),
});

export type NormalizedShoppingList = z.infer<
  typeof NormalizedShoppingListSchema
>;

/**
 * 食材リストを正規化して集計
 */
export async function normalizeShoppingList(
  input: ShoppingListNormalizerInput
): Promise<NormalizedShoppingList> {
  const prompt = getShoppingListNormalizerPrompt(input);

  return await callModelWithSchema(
    SHOPPING_LIST_NORMALIZER_INSTRUCTIONS,
    prompt,
    NormalizedShoppingListSchema,
    GEMINI_3_FLASH_MODEL
  );
}
