/**
 * FaveFit v2 - プランサービス
 * プラン生成・リフレッシュに関するビジネスロジック
 */

import {
  PlanGeneratorInput,
  generateMealPlan,
  normalizeShoppingList,
} from "@/server/ai";
import {
  getOrCreateUser,
  setPlanCreating,
  setPlanCreated,
  clearUserRejectionFeedback,
  updateUserRejectionFeedback,
} from "@/server/db/firestore/userRepository";
import {
  createPlan,
  updatePlanStatus,
  getActivePlan as getActivePlanRepo,
  getPendingPlan as getPendingPlanRepo,
  getPlan,
} from "@/server/db/firestore/planRepository";
import { createShoppingList } from "@/server/db/firestore/shoppingListRepository";
import { getFavorites } from "@/server/db/firestore/recipeHistoryRepository";
import { DayPlan, ShoppingItem, PlanDocument } from "@/lib/schema";
import { calculatePersonalizedMacroGoals } from "@/lib/tools/calculateMacroGoals";
import { calculateMealTargets } from "@/lib/tools/mealNutritionCalculator";

export interface GeneratePlanRequest {
  userId: string;
  startDate?: string;
  duration?: number;
  feedback?: string;
}

export interface GeneratePlanResponse {
  status: "started" | "already_creating";
  message: string;
}

export interface ApprovePlanRequest {
  userId: string;
  planId: string;
}

export interface ApprovePlanResponse {
  success: boolean;
  message: string;
}

export interface RejectPlanRequest {
  userId: string;
  planId: string;
  feedback?: string;
}

export interface RejectPlanResponse {
  success: boolean;
  message: string;
}

export interface GetActivePlanRequest {
  userId: string;
}

export interface GetActivePlanResponse {
  plan: PlanDocument | null;
}

export interface GetPendingPlanRequest {
  userId: string;
}

export interface GetPendingPlanResponse {
  plan: PlanDocument | null;
}

/**
 * アクティブなプランを取得
 */
export async function getActivePlan(
  request: GetActivePlanRequest
): Promise<GetActivePlanResponse> {
  const { userId } = request;
  const plan = await getActivePlanRepo(userId);
  return { plan };
}

/**
 * 承認待ちのプランを取得
 */
export async function getPendingPlan(
  request: GetPendingPlanRequest
): Promise<GetPendingPlanResponse> {
  const { userId } = request;
  const plan = await getPendingPlanRepo(userId);
  return { plan };
}

/**
 * プランを生成（非同期）
 */
export async function generatePlan(
  request: GeneratePlanRequest
): Promise<GeneratePlanResponse> {
  const { userId } = request;

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    throw new Error("ユーザーが見つかりません");
  }

  if (userDoc.planCreationStatus === "creating") {
    return {
      status: "already_creating",
      message: "プランは現在作成中です。しばらくお待ちください。",
    };
  }

  await setPlanCreating(userId);
  console.log(`[generatePlan] Started plan generation for user ${userId}`);

  generatePlanBackground(userId, userDoc, request).catch((error) => {
    console.error(
      `[generatePlan] Background plan generation failed for user ${userId}:`,
      error
    );
    if (error instanceof Error) {
      console.error(`[generatePlan] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    // エラーが発生した場合でも、ステータスをクリア
    setPlanCreated(userId).catch((statusError) => {
      console.error(
        `[generatePlan] Failed to clear plan creation status after error:`,
        statusError
      );
    });
  });

  return {
    status: "started",
    message: "プラン作成を開始しました。作成には1〜2分かかる場合があります。",
  };
}

/**
 * プラン生成のバックグラウンド処理
 */
async function generatePlanBackground(
  userId: string,
  userDoc: Awaited<ReturnType<typeof getOrCreateUser>>,
  options: Partial<GeneratePlanRequest> = {}
) {
  if (!userDoc) return;

  try {
    const favorites = await getFavorites(userId);
    const favoriteRecipes = favorites.map((f) => ({
      id: f.id,
      title: f.title,
      tags: f.tags,
    }));
    const cheapIngredients = ["キャベツ", "もやし", "鶏むね肉", "卵", "豆腐"]; // TODO: DBから取得

    // オプションの開始日があればそれを使用、なければ今日
    const startDate =
      options.startDate || new Date().toISOString().split("T")[0];
    const duration = options.duration || 7;

    // 既存のプランをアーカイブ
    const existingPlanResult = await getActivePlanRepo(userId);
    if (existingPlanResult) {
      await updatePlanStatus(existingPlanResult.id!, "archived");
    }

    // 栄養目標の計算
    const { targetCalories, pfc } = calculateUserMacroGoals(userDoc);
    const mealTargets = calculateMealTargets({
      calories: targetCalories,
      ...pfc,
    });

    const input: PlanGeneratorInput = {
      targetCalories,
      pfc,
      mealTargets,
      preferences: {
        cuisines: userDoc.learnedPreferences.cuisines,
        flavorProfile: userDoc.learnedPreferences.flavorProfile,
        dislikedIngredients: userDoc.learnedPreferences.dislikedIngredients,
      },
      favoriteRecipes,
      cheapIngredients,
      cheatDayFrequency: "weekly",
      startDate,
      mealSettings: userDoc.profile.lifestyle.mealSettings,
      mealPrep: userDoc.profile.lifestyle.mealPrepConfig
        ? {
            prepDay: new Date().toISOString().split("T")[0], // 仮
            servings: userDoc.profile.lifestyle.mealPrepConfig.servings,
          }
        : undefined,
      fridgeIngredients: userDoc.profile.lifestyle.fridgeIngredients,
      lifestyle: {
        availableTime: userDoc.profile.lifestyle.availableTime,
        maxCookingTime: userDoc.profile.lifestyle.maxCookingTimePerMeal?.lunch,
      },
      currentDiet: userDoc.profile.lifestyle.currentDiet, // 適応型プランニング用
    };

    // フィードバックの結合
    // options.feedback（今回の一時的な指示）と userDoc.planRejectionFeedback（以前の拒否理由）を結合
    const combinedFeedback = [userDoc.planRejectionFeedback, options.feedback]
      .filter(Boolean)
      .join("\n\n");

    // AI ワークフロー を実行
    const result = await generateMealPlan({
      input,
      feedbackText: combinedFeedback,
      mealTargets,
      dislikedIngredients: userDoc.learnedPreferences.dislikedIngredients,
      userId,
      duration, // ワークフローにも期間を渡す
    });

    if (!result.isValid && result.invalidMealsCount > 0) {
      console.warn(
        `[generatePlanBackground] ${result.invalidMealsCount} meals had fallback applied`
      );
    }

    const days = result.days;

    // 保存
    await createPlan(userId, startDate, days, "pending");
    await clearUserRejectionFeedback(userId);
  } catch (error) {
    console.error(`[Plan Generation] Failed for user ${userId}:`, error);
    throw error;
  } finally {
    await setPlanCreated(userId).catch(() => {});
  }
}

/**
 * ユーザーのプロファイルから栄養目標（マクロ）を計算
 */
function calculateUserMacroGoals(
  userDoc: NonNullable<Awaited<ReturnType<typeof getOrCreateUser>>>
) {
  const { physical, lifestyle } = userDoc.profile;
  const hasRequiredProfileData =
    physical.age &&
    physical.gender &&
    (physical.gender === "male" || physical.gender === "female") &&
    physical.height_cm &&
    physical.currentWeight &&
    lifestyle.activityLevel &&
    physical.goal;

  if (!hasRequiredProfileData) {
    return {
      targetCalories: 1800,
      pfc: { protein: 100, fat: 50, carbs: 200 },
    };
  }

  // preferences がある場合は決定論の計算を優先
  if (userDoc.nutrition?.preferences) {
    return calculatePersonalizedMacroGoals({
      age: physical.age!,
      gender: physical.gender as "male" | "female",
      height_cm: physical.height_cm!,
      weight_kg: physical.currentWeight,
      activity_level: lifestyle.activityLevel!,
      goal: physical.goal!,
      preferences: userDoc.nutrition.preferences,
    });
  }

  // 既存の明示的な栄養データがある場合
  if (
    userDoc.nutrition?.dailyCalories &&
    userDoc.nutrition.dailyCalories > 0 &&
    userDoc.nutrition.pfc?.protein &&
    userDoc.nutrition.pfc.protein > 0
  ) {
    return {
      targetCalories: userDoc.nutrition.dailyCalories,
      pfc: userDoc.nutrition.pfc,
    };
  }

  // プロファイル情報から標準計算
  return calculatePersonalizedMacroGoals({
    age: physical.age!,
    gender: physical.gender as "male" | "female",
    height_cm: physical.height_cm!,
    weight_kg: physical.currentWeight,
    activity_level: lifestyle.activityLevel!,
    goal: physical.goal!,
  });
}

/**
 * 買い物リストを生成
 */
async function generateShoppingListFromRecipes(
  userId: string,
  planId: string,
  days: Record<string, DayPlan>
): Promise<void> {
  // 1. 全レシピから食材を抽出
  const rawIngredients = Object.values(days)
    .filter((dayPlan) => !dayPlan.isCheatDay)
    .flatMap((dayPlan) => Object.values(dayPlan.meals))
    .flatMap((meal) => meal.ingredients ?? []);

  if (rawIngredients.length === 0) return;

  // 2. ユーザーの冷蔵庫在庫を取得
  const user = await getOrCreateUser(userId);
  const fridgeItems = user?.profile.lifestyle.fridgeIngredients || [];

  // 3. AIによる正規化を実行
  console.log(
    `[PlanService] Normalizing shopping list for ${rawIngredients.length} items...`
  );
  const normalized = await normalizeShoppingList({
    ingredients: rawIngredients,
    fridgeItems,
  });

  // 4. Firestore 形式に変換
  const shoppingItems: ShoppingItem[] = [];
  normalized.categories.forEach((category) => {
    category.items.forEach((item) => {
      shoppingItems.push({
        ingredient: item.name,
        amount: item.amount,
        category: category.name,
        checked: false,
        note: item.note,
      });
    });
  });

  // 5. 保存
  if (shoppingItems.length > 0) {
    await createShoppingList(planId, shoppingItems);
  }
}

/**
 * プランを承認し、レシピ詳細生成を開始
 */
export async function approvePlan(
  request: ApprovePlanRequest
): Promise<ApprovePlanResponse> {
  const { userId, planId } = request;

  // プランを取得して確認
  const plan = await getPlan(planId);
  if (!plan) {
    throw new Error("プランが見つかりません");
  }

  if (plan.userId !== userId) {
    throw new Error("このプランにアクセスする権限がありません");
  }

  if (plan.status !== "pending") {
    throw new Error("このプランは承認可能な状態ではありません");
  }

  // プランのステータスをactiveに変更
  await updatePlanStatus(planId, "active");

  // バックグラウンドでレシピ詳細生成を開始
  approvePlanAndGenerateDetails(userId, planId, plan.days).catch((error) => {
    console.error("Background recipe detail generation failed:", error);
  });

  return {
    success: true,
    message: "プランを承認しました。買い物リストを作成中です。",
  };
}

/**
 * プラン承認後の処理（バックグラウンド処理）
 */
async function approvePlanAndGenerateDetails(
  userId: string,
  planId: string,
  days: Record<string, DayPlan>
): Promise<void> {
  try {
    // 買い物リストを生成
    await generateShoppingListFromRecipes(userId, planId, days);
  } catch (error) {
    console.error("Error in approvePlanAndGenerateDetails:", error);
    throw error;
  }
}

/**
 * プランを拒否（削除）
 */
export async function rejectPlan(
  request: RejectPlanRequest
): Promise<RejectPlanResponse> {
  const { userId, planId, feedback } = request;

  // プランを取得して確認
  const plan = await getPlan(planId);
  if (!plan) {
    throw new Error("プランが見つかりません");
  }

  if (plan.userId !== userId) {
    throw new Error("このプランにアクセスする権限がありません");
  }

  if (plan.status !== "pending") {
    throw new Error("このプランは拒否可能な状態ではありません");
  }

  // プランをarchivedに変更（削除の代わり）
  await updatePlanStatus(planId, "archived");

  // フィードバックがある場合はユーザードキュメントに保存
  if (feedback && feedback.trim()) {
    await updateUserRejectionFeedback(userId, feedback.trim());
  }

  return {
    success: true,
    message: "プランを拒否しました。",
  };
}
