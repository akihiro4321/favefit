/**
 * FaveFit v2 - 買い物リストサービス
 * プランに連動した買い物リスト管理
 */

import { db } from "@/lib/db/firestore/client";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ShoppingListDocument, ShoppingItem } from "./schema";

// ========================================
// 買い物リスト操作
// ========================================

/**
 * 買い物リストを作成
 */
export const createShoppingList = async (
  planId: string,
  items: ShoppingItem[]
): Promise<void> => {
  try {
    const listRef = doc(db, "shoppingLists", planId);

    const shoppingList: ShoppingListDocument = {
      planId,
      items,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(listRef, shoppingList);
  } catch (error) {
    console.error("Error creating shopping list:", error);
    throw error;
  }
};

/**
 * 買い物リストを取得
 */
export const getShoppingList = async (
  planId: string
): Promise<ShoppingListDocument | null> => {
  try {
    const listRef = doc(db, "shoppingLists", planId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
      return null;
    }

    return listSnap.data() as ShoppingListDocument;
  } catch (error) {
    console.error("Error getting shopping list:", error);
    return null;
  }
};

/**
 * アイテムのチェック状態を切り替え
 */
export const toggleItemCheck = async (
  planId: string,
  itemIndex: number,
  checked: boolean
): Promise<void> => {
  try {
    const listRef = doc(db, "shoppingLists", planId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
      throw new Error("Shopping list not found");
    }

    const currentList = listSnap.data() as ShoppingListDocument;
    const updatedItems = [...currentList.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      checked,
    };

    await updateDoc(listRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error toggling item check:", error);
    throw error;
  }
};

/**
 * 全アイテムをチェック済みにする
 */
export const checkAllItems = async (planId: string): Promise<void> => {
  try {
    const listRef = doc(db, "shoppingLists", planId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
      throw new Error("Shopping list not found");
    }

    const currentList = listSnap.data() as ShoppingListDocument;
    const updatedItems = currentList.items.map((item) => ({
      ...item,
      checked: true,
    }));

    await updateDoc(listRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error checking all items:", error);
    throw error;
  }
};

/**
 * カテゴリ別にアイテムを取得
 */
export const getItemsByCategory = async (
  planId: string
): Promise<Record<string, ShoppingItem[]>> => {
  try {
    const list = await getShoppingList(planId);
    if (!list) {
      return {};
    }

    return list.items.reduce((acc, item) => {
      const category = item.category || "その他";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);
  } catch (error) {
    console.error("Error getting items by category:", error);
    return {};
  }
};

/**
 * 未購入アイテム数を取得
 */
export const getUncheckedCount = async (planId: string): Promise<number> => {
  try {
    const list = await getShoppingList(planId);
    if (!list) {
      return 0;
    }

    return list.items.filter((item) => !item.checked).length;
  } catch (error) {
    console.error("Error getting unchecked count:", error);
    return 0;
  }
};
