/**
 * FaveFit v2 - 買い物リストサービス
 * 買い物リスト関連のビジネスロジック
 */

import {
  getShoppingList as getShoppingListRepo,
  toggleItemCheck as toggleItemCheckRepo,
  getItemsByCategory as getItemsByCategoryRepo,
} from "@/server/db/firestore/shoppingListRepository";
import { ShoppingListDocument, ShoppingItem } from "@/lib/schema";

export interface GetShoppingListRequest {
  planId: string;
}

export interface GetShoppingListResponse {
  shoppingList: ShoppingListDocument | null;
}

export interface ToggleItemCheckRequest {
  planId: string;
  itemIndex: number;
  checked: boolean;
}

export interface GetItemsByCategoryRequest {
  planId: string;
}

export interface GetItemsByCategoryResponse {
  items: Record<string, ShoppingItem[]>;
}

/**
 * 買い物リストを取得
 */
export async function getShoppingList(
  request: GetShoppingListRequest
): Promise<GetShoppingListResponse> {
  const { planId } = request;
  const shoppingList = await getShoppingListRepo(planId);
  return { shoppingList };
}

/**
 * アイテムのチェック状態を切り替え
 */
export async function toggleItemCheck(
  request: ToggleItemCheckRequest
): Promise<void> {
  const { planId, itemIndex, checked } = request;
  await toggleItemCheckRepo(planId, itemIndex, checked);
}

/**
 * カテゴリ別にアイテムを取得
 */
export async function getItemsByCategory(
  request: GetItemsByCategoryRequest
): Promise<GetItemsByCategoryResponse> {
  const { planId } = request;
  const items = await getItemsByCategoryRepo(planId);
  return { items };
}
