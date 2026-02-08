import {
  collection,
  CollectionReference,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  doc,
  DocumentReference,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { db } from "./client";
import {
  UserDocument,
  PlanDocument,
  RecipeHistoryItem,
  FavoriteRecipe,
  ShoppingListDocument,
  MarketPriceDocument,
} from "@/lib/schema";

// 各リポジトリ固有の型定義（後で schema.ts に移動するのが理想的）
export interface SavedRecipe {
  id: string;
  userId: string;
  createdAt: Timestamp | FieldValue;
  feedbackId?: string;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface FeedbackRatings {
  overall: number;
  taste: number;
  ease: number;
  satisfaction: number;
}

export interface Feedback {
  id?: string;
  userId: string;
  recipeId: string;
  createdAt: Timestamp | FieldValue;
  cooked: boolean;
  ratings: FeedbackRatings;
  repeatPreference: "definitely" | "sometimes" | "never";
  comment?: string;
  analyzedTags?: {
    positiveTags: string[];
    negativeTags: string[];
    extractedPreferences: string[];
  };
}

/**
 * Firestore 用の汎用データコンバーター
 */
const createConverter = <
  T extends DocumentData,
>(): FirestoreDataConverter<T> => ({
  toFirestore(data: T): DocumentData {
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
    return snapshot.data(options) as T;
  },
});

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
export const getCollection = <T extends DocumentData>(
  ...pathSegments: string[]
): CollectionReference<T> => {
  return collection(
    db,
    pathSegments[0],
    ...pathSegments.slice(1)
  ).withConverter(createConverter<T>());
};

/**
 * 型安全なドキュメント参照の取得
 */
export const getDocRef = <T extends DocumentData>(
  ...pathSegments: string[]
): DocumentReference<T> => {
  return doc(db, pathSegments[0], ...pathSegments.slice(1)).withConverter(
    createConverter<T>()
  );
};

/**
 * 各コレクションへのアクセス用ヘルパー
 */
export const collections = {
  users: getCollection<UserDocument>(COLLECTIONS.USERS),
  plans: getCollection<PlanDocument>(COLLECTIONS.PLANS),
  shoppingLists: getCollection<ShoppingListDocument>(
    COLLECTIONS.SHOPPING_LISTS
  ),
  marketPrices: getCollection<MarketPriceDocument>(COLLECTIONS.MARKET_PRICES),

  // サブコレクションへの参照を生成する関数
  recipeHistory: (userId: string) =>
    getCollection<RecipeHistoryItem>(
      COLLECTIONS.RECIPE_HISTORY,
      userId,
      "recipes"
    ),

  favoriteRecipes: (userId: string) =>
    getCollection<FavoriteRecipe>(
      COLLECTIONS.FAVORITE_RECIPES,
      userId,
      "recipes"
    ),

  // ユーザー配下の固有データ
  userRecipes: (userId: string) =>
    getCollection<SavedRecipe>(COLLECTIONS.USERS, userId, "recipes"),

  userFeedbacks: (userId: string) =>
    getCollection<Feedback>(COLLECTIONS.USERS, userId, "feedbacks"),
};

/**
 * 個別ドキュメントへのアクセス用ヘルパー
 */
export const docRefs = {
  user: (userId: string) => getDocRef<UserDocument>(COLLECTIONS.USERS, userId),
  plan: (planId: string) => getDocRef<PlanDocument>(COLLECTIONS.PLANS, planId),
  recipeHistoryItem: (userId: string, recipeId: string) =>
    getDocRef<RecipeHistoryItem>(
      COLLECTIONS.RECIPE_HISTORY,
      userId,
      "recipes",
      recipeId
    ),
  favoriteRecipe: (userId: string, recipeId: string) =>
    getDocRef<FavoriteRecipe>(
      COLLECTIONS.FAVORITE_RECIPES,
      userId,
      "recipes",
      recipeId
    ),
  shoppingList: (listId: string) =>
    getDocRef<ShoppingListDocument>(COLLECTIONS.SHOPPING_LISTS, listId),
  marketPrices: () =>
    getDocRef<MarketPriceDocument>(COLLECTIONS.MARKET_PRICES, "latest"),

  userRecipe: (userId: string, recipeId: string) =>
    getDocRef<SavedRecipe>(COLLECTIONS.USERS, userId, "recipes", recipeId),

  userFeedback: (userId: string, feedbackId: string) =>
    getDocRef<Feedback>(COLLECTIONS.USERS, userId, "feedbacks", feedbackId),
};
