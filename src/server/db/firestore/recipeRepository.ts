/**
 * FaveFit v2 - 保存済みレシピリポジトリ
 */

import * as admin from "firebase-admin";
import { adminCollections, adminDocRefs } from "./adminCollections";
import { SavedRecipe } from "./collections";
import { Recipe } from "@/server/ai/functions/recipe-generator";

export type { SavedRecipe };

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

export const saveRecipe = async (
  userId: string,
  recipeData: Recipe
): Promise<string> => {
  try {
    const recipesRef = adminCollections.userRecipes(userId);
    const docRef = await recipesRef.add({
      ...recipeData,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving recipe:", error);
    throw error;
  }
};

export interface PaginatedRecipes {
  recipes: SavedRecipe[];
  lastVisible: admin.firestore.QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const getSavedRecipes = async (
  userId: string,
  pageSize: number = 20,
  lastVisibleDoc?: admin.firestore.QueryDocumentSnapshot
): Promise<PaginatedRecipes> => {
  try {
    const recipesRef = adminCollections.userRecipes(userId);
    let q = recipesRef.orderBy("createdAt", "desc").limit(pageSize);

    if (lastVisibleDoc) {
      q = q.startAfter(lastVisibleDoc);
    }

    const querySnapshot = await q.get();

    const recipes = querySnapshot.docs.map((doc) => ({
      ...(doc.data() as SavedRecipe),
      id: doc.id,
    }));

    const lastVisible =
      (querySnapshot.docs[
        querySnapshot.docs.length - 1
      ] as admin.firestore.QueryDocumentSnapshot) || null;
    const hasMore = querySnapshot.docs.length === pageSize;

    return {
      recipes,
      lastVisible,
      hasMore,
    };
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return {
      recipes: [],
      lastVisible: null,
      hasMore: false,
    };
  }
};

export const getRecipe = async (
  userId: string,
  recipeId: string
): Promise<SavedRecipe | null> => {
  try {
    const recipeRef = adminDocRefs.userRecipe(userId, recipeId);
    const docSnap = await recipeRef.get();

    if (docSnap.exists) {
      return {
        ...(docSnap.data() as SavedRecipe),
        id: docSnap.id,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return null;
  }
};

export const updateRecipeFeedbackId = async (
  userId: string,
  recipeId: string,
  feedbackId: string
): Promise<void> => {
  try {
    const recipeRef = adminDocRefs.userRecipe(userId, recipeId);
    await recipeRef.update({
      feedbackId,
    });
  } catch (error) {
    console.error("Error updating recipe with feedbackId:", error);
    throw error;
  }
};
