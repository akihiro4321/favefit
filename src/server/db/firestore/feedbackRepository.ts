import { db } from './client';
import { collection, addDoc, serverTimestamp, FieldValue, Timestamp, query, getDocs, orderBy } from 'firebase/firestore';

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
  createdAt: FieldValue | Timestamp;
  cooked: boolean;
  ratings: FeedbackRatings;
  repeatPreference: 'definitely' | 'sometimes' | 'never';
  comment?: string;
  analyzedTags?: {
    positiveTags: string[];
    negativeTags: string[];
    extractedPreferences: string[];
  };
}

export const saveFeedback = async (userId: string, feedbackData: Omit<Feedback, 'id' | 'createdAt' | 'userId'>): Promise<string> => {
  try {
    const feedbacksRef = collection(db, 'users', userId, 'feedbacks');
    const docRef = await addDoc(feedbacksRef, {
      ...feedbackData,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw error;
  }
};

export const getFeedbacksByUser = async (userId: string): Promise<Feedback[]> => {
  try {
    const feedbacksRef = collection(db, 'users', userId, 'feedbacks');
    const q = query(feedbacksRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    return [];
  }
};
