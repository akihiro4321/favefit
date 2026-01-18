import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, FieldValue, Timestamp } from 'firebase/firestore';
import { Recipe } from '@/lib/agents/recipe-creator';

export interface SavedRecipe extends Recipe {
  id?: string;
  userId: string;
  createdAt: FieldValue | Timestamp;
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
