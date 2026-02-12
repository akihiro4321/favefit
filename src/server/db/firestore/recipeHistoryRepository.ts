/**
 * FaveFit v2 - レシピ履歴サービス
 * 過去に提案されたレシピの管理
 */

import * as admin from "firebase-admin";
import { adminCollections, adminDocRefs } from "./adminCollections";
import { RecipeHistoryItem, FavoriteRecipe } from "@/lib/schema";

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

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
    const historyRef = adminDocRefs.recipeHistoryItem(userId, recipe.id);

    const historyItem: RecipeHistoryItem = {
      ...recipe,
      proposedAt: serverTimestamp() as any,
      cookedAt: null,
      isFavorite: false,
    };

    await historyRef.set(historyItem);
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
    const historyRef = adminCollections.recipeHistory(userId);
    const querySnapshot = await historyRef
      .orderBy("proposedAt", "desc")
      .limit(limitCount)
      .get();

    return querySnapshot.docs.map((doc) => doc.data() as RecipeHistoryItem);
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
    const historyRef = adminDocRefs.recipeHistoryItem(userId, recipeId);
    const snap = await historyRef.get();
    if (!snap.exists) return null;
    return snap.data() as RecipeHistoryItem;
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
    const recipeRef = adminDocRefs.recipeHistoryItem(userId, recipeId);
    await recipeRef.update({
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
    const historyRef = adminDocRefs.recipeHistoryItem(userId, recipeId);
    const historySnap = await historyRef.get();

    if (!historySnap.exists) {
      throw new Error("Recipe not found in history");
    }

    const recipeData = historySnap.data() as RecipeHistoryItem;

    await historyRef.update({ isFavorite: true });

    // favoriteRecipesにも追加
    const favoriteRef = adminDocRefs.favoriteRecipe(userId, recipeId);
    const favorite: FavoriteRecipe = {
      id: recipeId,
      title: recipeData.title,
      tags: recipeData.tags,
      addedAt: serverTimestamp() as any,
      cookedCount: recipeData.cookedAt ? 1 : 0,
    };

    await favoriteRef.set(favorite);
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
    const favRef = adminCollections.favoriteRecipes(userId);
    const querySnapshot = await favRef.orderBy("addedAt", "desc").get();

    return querySnapshot.docs.map((doc) => doc.data() as FavoriteRecipe);
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
    const historyRef = adminCollections.recipeHistory(userId);
    const querySnapshot = await historyRef
      .where("cookedAt", "!=", null)
      .orderBy("cookedAt", "desc")
      .get();

    return querySnapshot.docs.map((doc) => doc.data() as RecipeHistoryItem);
  } catch (error) {
    console.error("Error getting cooked recipes:", error);
    return [];
  }
};
