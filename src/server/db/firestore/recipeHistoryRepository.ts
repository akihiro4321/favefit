/**
 * FaveFit v2 - レシピ履歴サービス
 * 過去に提案されたレシピの管理
 */

import {
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { collections, docRefs } from "./collections";
import { RecipeHistoryItem, FavoriteRecipe } from "@/lib/schema";

// ========================================
// レシピ履歴操作
// ========================================

/**
 * レシピを履歴に追加
 */
export const addToHistory = async (
  userId: string,
  recipe: Omit<RecipeHistoryItem, "proposedAt" | "cookedAt" | "isFavorite">
): Promise<void> => {
  try {
    const historyRef = docRefs.recipeHistoryItem(userId, recipe.id);

    const historyItem: RecipeHistoryItem = {
      ...recipe,
      proposedAt: serverTimestamp() as unknown as Timestamp,
      cookedAt: null,
      isFavorite: false,
    };

    await setDoc(historyRef, historyItem);
  } catch (error) {
    console.error("Error adding to history:", error);
    throw error;
  }
};

/**
 * レシピ履歴を取得
 */
export const getRecipeHistory = async (
  userId: string,
  limitCount: number = 50
): Promise<RecipeHistoryItem[]> => {
  try {
    const historyRef = collections.recipeHistory(userId);
    const q = query(
      historyRef,
      orderBy("proposedAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error getting recipe history:", error);
    return [];
  }
};

/**
 * 特定の履歴アイテムを取得
 */
export const getHistoryItem = async (
  userId: string,
  recipeId: string
): Promise<RecipeHistoryItem | null> => {
  try {
    const historyRef = docRefs.recipeHistoryItem(userId, recipeId);
    const snap = await getDoc(historyRef);
    if (!snap.exists()) return null;
    return snap.data();
  } catch (error) {
    console.error("Error getting history item:", error);
    return null;
  }
};

/**
 * 作成済みとしてマーク
 */
export const markAsCooked = async (
  userId: string,
  recipeId: string
): Promise<void> => {
  try {
    const recipeRef = docRefs.recipeHistoryItem(userId, recipeId);
    await updateDoc(recipeRef, {
      cookedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking as cooked:", error);
    throw error;
  }
};

/**
 * お気に入りに追加
 */
export const addToFavorites = async (
  userId: string,
  recipeId: string
): Promise<void> => {
  try {
    // 履歴のisFavoriteを更新
    const historyRef = docRefs.recipeHistoryItem(userId, recipeId);
    const historySnap = await getDoc(historyRef);

    if (!historySnap.exists()) {
      throw new Error("Recipe not found in history");
    }

    const recipeData = historySnap.data();

    await updateDoc(historyRef, { isFavorite: true });

    // favoriteRecipesにも追加
    const favoriteRef = docRefs.favoriteRecipe(userId, recipeId);
    const favorite: FavoriteRecipe = {
      id: recipeId,
      title: recipeData.title,
      tags: recipeData.tags,
      addedAt: serverTimestamp() as unknown as Timestamp,
      cookedCount: recipeData.cookedAt ? 1 : 0,
    };

    await setDoc(favoriteRef, favorite);
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
};

/**
 * お気に入りを取得
 */
export const getFavorites = async (
  userId: string
): Promise<FavoriteRecipe[]> => {
  try {
    const favRef = collections.favoriteRecipes(userId);
    const q = query(favRef, orderBy("addedAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
};

/**
 * 作成済みレシピのみ取得
 */
export const getCookedRecipes = async (
  userId: string
): Promise<RecipeHistoryItem[]> => {
  try {
    const historyRef = collections.recipeHistory(userId);
    const q = query(
      historyRef,
      where("cookedAt", "!=", null),
      orderBy("cookedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error getting cooked recipes:", error);
    return [];
  }
};
