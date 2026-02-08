/**
 * FaveFit v2 - フィードバックサービス
 * レシピフィードバック関連のビジネスロジック
 */

import {
  saveFeedback as saveFeedbackRepo,
  FeedbackRatings,
} from "@/server/db/firestore/feedbackRepository";
import { updateRecipeFeedbackId as updateRecipeFeedbackIdRepo } from "@/server/db/firestore/recipeRepository";

export interface SaveFeedbackRequest {
  userId: string;
  recipeId: string;
  cooked: boolean;
  ratings: FeedbackRatings;
  repeatPreference: "definitely" | "sometimes" | "never";
  comment: string;
}

export interface SaveFeedbackResponse {
  feedbackId: string;
}

/**
 * フィードバックを保存
 */
export async function saveFeedback(
  request: SaveFeedbackRequest
): Promise<SaveFeedbackResponse> {
  const { userId, recipeId, cooked, ratings, repeatPreference, comment } =
    request;

  const feedbackId = await saveFeedbackRepo(userId, {
    recipeId,
    cooked,
    ratings,
    repeatPreference,
    comment,
  });

  // レシピにフィードバックIDを紐付け
  await updateRecipeFeedbackIdRepo(userId, recipeId, feedbackId);

  return { feedbackId };
}
