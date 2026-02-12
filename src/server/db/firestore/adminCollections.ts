/**
 * Firebase Admin SDK 版のコレクション参照定義
 */

import { adminDb } from "./admin";
import * as admin from "firebase-admin";
import {
  UserDocument,
  PlanDocument,
  RecipeHistoryItem,
  FavoriteRecipe,
  ShoppingListDocument,
  MarketPriceDocument,
} from "@/lib/schema";

/**
 * コレクション名の定数
 */
export const COLLECTIONS = {
  USERS: "users",
  PLANS: "plans",
  RECIPE_HISTORY: "recipeHistory",
  FAVORITE_RECIPES: "favoriteRecipes",
  SHOPPING_LISTS: "shoppingLists",
  MARKET_PRICES: "marketPrices",
} as const;

/**
 * 型安全なコレクション参照の取得
 */
export const getAdminCollection = <T = admin.firestore.DocumentData>(
  ...pathSegments: string[]
): admin.firestore.CollectionReference<T> => {
  return adminDb.collection(
    pathSegments.join("/")
  ) as admin.firestore.CollectionReference<T>;
};

/**
 * 型安全なドキュメント参照の取得
 */
export const getAdminDocRef = <T = admin.firestore.DocumentData>(
  ...pathSegments: string[]
): admin.firestore.DocumentReference<T> => {
  return adminDb.doc(
    pathSegments.join("/")
  ) as admin.firestore.DocumentReference<T>;
};

/**
 * 各コレクションへのアクセス用ヘルパー
 */
export const adminCollections = {
  users: getAdminCollection<UserDocument>(COLLECTIONS.USERS),
  plans: getAdminCollection<PlanDocument>(COLLECTIONS.PLANS),
  shoppingLists: getAdminCollection<ShoppingListDocument>(
    COLLECTIONS.SHOPPING_LISTS
  ),
  marketPrices: getAdminCollection<MarketPriceDocument>(
    COLLECTIONS.MARKET_PRICES
  ),

  recipeHistory: (userId: string) =>
    getAdminCollection<RecipeHistoryItem>(
      COLLECTIONS.RECIPE_HISTORY,
      userId,
      "recipes"
    ),

  favoriteRecipes: (userId: string) =>
    getAdminCollection<FavoriteRecipe>(
      COLLECTIONS.FAVORITE_RECIPES,
      userId,
      "recipes"
    ),

  userFeedbacks: (userId: string) =>
    getAdminCollection<any>(COLLECTIONS.USERS, userId, "feedbacks"),

  userRecipes: (userId: string) =>
    getAdminCollection<any>(COLLECTIONS.USERS, userId, "recipes"),
};

/**
 * 個別ドキュメントへのアクセス用ヘルパー
 */
export const adminDocRefs = {
  user: (userId: string) =>
    getAdminDocRef<UserDocument>(COLLECTIONS.USERS, userId),
  plan: (planId: string) =>
    getAdminDocRef<PlanDocument>(COLLECTIONS.PLANS, planId),
  recipeHistoryItem: (userId: string, recipeId: string) =>
    getAdminDocRef<RecipeHistoryItem>(
      COLLECTIONS.RECIPE_HISTORY,
      userId,
      "recipes",
      recipeId
    ),
  favoriteRecipe: (userId: string, recipeId: string) =>
    getAdminDocRef<FavoriteRecipe>(
      COLLECTIONS.FAVORITE_RECIPES,
      userId,
      "recipes",
      recipeId
    ),
  shoppingList: (listId: string) =>
    getAdminDocRef<ShoppingListDocument>(COLLECTIONS.SHOPPING_LISTS, listId),
  marketPrices: () =>
    getAdminDocRef<MarketPriceDocument>(COLLECTIONS.MARKET_PRICES, "latest"),

  userRecipe: (userId: string, recipeId: string) =>
    getAdminDocRef<any>(COLLECTIONS.USERS, userId, "recipes", recipeId),

  userFeedback: (userId: string, feedbackId: string) =>
    getAdminDocRef<any>(COLLECTIONS.USERS, userId, "feedbacks", feedbackId),
};
