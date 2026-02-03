/**
 * FaveFit v2 - レシピ履歴サービス
 * レシピ履歴・お気に入り関連のビジネスロジック
 */

import {
  addToFavorites as addToFavoritesRepo,
  markAsCooked as markAsCookedRepo,
  getRecipeHistory as getRecipeHistoryRepo,
  getFavorites as getFavoritesRepo,
} from "@/server/db/firestore/recipeHistoryRepository";
import { RecipeHistoryItem, FavoriteRecipe } from "@/lib/schema";

export interface AddToFavoritesRequest {
  userId: string;
  recipeId: string;
}

export interface MarkAsCookedRequest {
  userId: string;
  recipeId: string;
}

export interface GetRecipeHistoryRequest {
  userId: string;
  limitCount?: number;
}

export interface GetRecipeHistoryResponse {
  history: RecipeHistoryItem[];
}

export interface GetFavoritesRequest {
  userId: string;
}

export interface GetFavoritesResponse {
  favorites: FavoriteRecipe[];
}

/**
 * お気に入りに追加
 */
export async function addToFavorites(
  request: AddToFavoritesRequest
): Promise<void> {
  const { userId, recipeId } = request;
  await addToFavoritesRepo(userId, recipeId);
}

/**
 * 作成済みとしてマーク
 */
export async function markAsCooked(
  request: MarkAsCookedRequest
): Promise<void> {
  const { userId, recipeId } = request;
  await markAsCookedRepo(userId, recipeId);
}

/**
 * レシピ履歴を取得
 */
export async function getRecipeHistory(
  request: GetRecipeHistoryRequest
): Promise<GetRecipeHistoryResponse> {
  const { userId, limitCount } = request;
  const history = await getRecipeHistoryRepo(userId, limitCount);
  return { history };
}

/**
 * お気に入りを取得
 */
export async function getFavorites(
  request: GetFavoritesRequest
): Promise<GetFavoritesResponse> {
  const { userId } = request;
  const favorites = await getFavoritesRepo(userId);
  return { favorites };
}
