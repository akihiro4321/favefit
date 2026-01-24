import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, query, orderBy, getDocs, getDoc, serverTimestamp, Timestamp, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { Recipe } from '@/mastra/agents/recipe-creator';

export interface SavedRecipe extends Recipe {
  id: string;
  userId: string;
  createdAt: Timestamp;
  feedbackId?: string;
}

export const saveRecipe = async (userId: string, recipeData: Recipe): Promise<string> => {
  try {
    const recipesRef = collection(db, 'users', userId, 'recipes');
    const docRef = await addDoc(recipesRef, {
      ...recipeData,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving recipe:', error);
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
    const recipesRef = collection(db, 'users', userId, 'recipes');
    let q = query(recipesRef, orderBy('createdAt', 'desc'), limit(pageSize));

    if (lastVisibleDoc) {
      q = query(recipesRef, orderBy('createdAt', 'desc'), startAfter(lastVisibleDoc), limit(pageSize));
    }

    const querySnapshot = await getDocs(q);

    const recipes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SavedRecipe));

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    const hasMore = querySnapshot.docs.length === pageSize;

    return {
      recipes,
      lastVisible,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return {
      recipes: [],
      lastVisible: null,
      hasMore: false
    };
  }
};

export const getRecipe = async (userId: string, recipeId: string): Promise<SavedRecipe | null> => {
  try {
    const recipeRef = doc(db, 'users', userId, 'recipes', recipeId);
    const docSnap = await getDoc(recipeRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as SavedRecipe;
    }
    return null;
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return null;
  }
};

export const updateRecipeFeedbackId = async (userId: string, recipeId: string, feedbackId: string): Promise<void> => {
  try {
    const recipeRef = doc(db, 'users', userId, 'recipes', recipeId);
    await updateDoc(recipeRef, {
      feedbackId,
    });
  } catch (error) {
    console.error('Error updating recipe with feedbackId:', error);
    throw error;
  }
};
