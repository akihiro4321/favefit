/**
 * FaveFit v2 - フィードバックリポジトリ
 */

import {
  addDoc,
  serverTimestamp,
  query,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { collections, Feedback, FeedbackRatings } from "./collections";

export type { Feedback, FeedbackRatings };

export const saveFeedback = async (
  userId: string,
  feedbackData: Omit<Feedback, "id" | "createdAt" | "userId">
): Promise<string> => {
  try {
    const feedbacksRef = collections.userFeedbacks(userId);
    const docRef = await addDoc(feedbacksRef, {
      ...feedbackData,
      userId,
      createdAt: serverTimestamp(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return docRef.id;
  } catch (error) {
    console.error("Error saving feedback:", error);
    throw error;
  }
};

export const getFeedbacksByUser = async (
  userId: string
): Promise<Feedback[]> => {
  try {
    const feedbacksRef = collections.userFeedbacks(userId);
    const q = query(feedbacksRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return [];
  }
};
