/**
 * FaveFit v2 - フィードバックリポジトリ
 */

import * as admin from "firebase-admin";
import { adminCollections } from "./adminCollections";
import { Feedback, FeedbackRatings } from "./collections";

export type { Feedback, FeedbackRatings };

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

export const saveFeedback = async (
  userId: string,
  feedbackData: Omit<Feedback, "id" | "createdAt" | "userId">
): Promise<string> => {
  try {
    const feedbacksRef = adminCollections.userFeedbacks(userId);
    const docRef = await feedbacksRef.add({
      ...feedbackData,
      userId,
      createdAt: serverTimestamp(),
    });
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
    const feedbacksRef = adminCollections.userFeedbacks(userId);
    const snapshot = await feedbacksRef.orderBy("createdAt", "desc").get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Feedback
    );
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return [];
  }
};
