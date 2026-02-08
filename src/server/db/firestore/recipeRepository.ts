/**
 * FaveFit v2 - 保存済みレシピリポジトリ
 */

import {
  addDoc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  getDoc,
  serverTimestamp,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import { collections, docRefs, SavedRecipe } from "./collections";
import { Recipe } from "@/server/ai/functions/recipe-generator";

export type { SavedRecipe };

export const saveRecipe = async (
  userId: string,
  recipeData: Recipe
): Promise<string> => {
  try {
    const recipesRef = collections.userRecipes(userId);
    const docRef = await addDoc(recipesRef, {
      ...recipeData,
      userId,
      createdAt: serverTimestamp(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return docRef.id;
  } catch (error) {
    console.error("Error saving recipe:", error);
    throw error;
  }
};

export interface PaginatedRecipes {
  recipes: SavedRecipe[];
  lastVisible: DocumentSnapshot | null;
  hasMore: boolean;
}

export const getSavedRecipes = async (
  userId: string,
  pageSize: number = 20,
  lastVisibleDoc?: DocumentSnapshot
): Promise<PaginatedRecipes> => {
  try {
    const recipesRef = collections.userRecipes(userId);
    let q = query(recipesRef, orderBy("createdAt", "desc"), limit(pageSize));

    if (lastVisibleDoc) {
      q = query(
        recipesRef,
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);

    const recipes = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));

    const lastVisible =
      querySnapshot.docs[querySnapshot.docs.length - 1] || null;
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
    const recipeRef = docRefs.userRecipe(userId, recipeId);
    const docSnap = await getDoc(recipeRef);

    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
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
    const recipeRef = docRefs.userRecipe(userId, recipeId);
    await updateDoc(recipeRef, {
      feedbackId,
    });
  } catch (error) {
    console.error("Error updating recipe with feedbackId:", error);
    throw error;
  }
};
