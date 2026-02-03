/**
 * FaveFit v2 - プランサービス
 * 7日間プランの作成・取得・更新
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { collections, docRefs } from "./collections";
import {
  PlanDocument,
  DayPlan,
  MealSlot,
  MealStatus,
  PlanStatus,
} from "@/lib/schema";

// ========================================
// プラン操作
// ========================================

/**
 * 新規プランを作成
 */
export const createPlan = async (
  userId: string,
  startDate: string,
  days: Record<string, DayPlan>,
  status: PlanStatus = "active"
): Promise<string> => {
  try {
    console.log(`[createPlan] Starting plan creation for user ${userId}, status: ${status}, days count: ${Object.keys(days).length}`);
    const plansRef = collections.plans;
    const planDoc = docRefs.plan(doc(plansRef).id); // 既存の doc(plansRef) で ID 生成するロジックを docRefs に合わせる
    const planId = planDoc.id;
    console.log(`[createPlan] Generated plan document ID: ${planId}`);

    const newPlan: PlanDocument = {
      userId,
      startDate,
      status,
      days,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log(`[createPlan] Attempting to write plan document to Firestore: plans/${planId}`);
    await setDoc(planDoc, newPlan);
    console.log(`[createPlan] Successfully created plan ${planId} in Firestore for user ${userId}`);
    
    // 書き込みが成功したことを確認するために、読み取りを試みる（オプション）
    try {
      const verificationDoc = await getDoc(planDoc);
      if (verificationDoc.exists()) {
        console.log(`[createPlan] Verified plan ${planId} exists in Firestore`);
      } else {
        console.warn(`[createPlan] Warning: Plan ${planId} was created but verification read returned empty`);
      }
    } catch (verifyError) {
      console.warn(`[createPlan] Could not verify plan ${planId} (non-critical):`, verifyError);
    }
    
    return planId;
  } catch (error) {
    console.error(`[createPlan] Error creating plan for user ${userId}:`, error);
    if (error instanceof Error) {
      console.error(`[createPlan] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      // Firebaseエラーの詳細情報を確認
      if ('code' in error) {
        console.error(`[createPlan] Firebase error code:`, (error as { code?: string }).code);
      }
    }
    throw error;
  }
};

/**
 * プランを取得
 */
export const getPlan = async (planId: string): Promise<(PlanDocument & { id: string }) | null> => {
  try {
    const planRef = docRefs.plan(planId);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      return null;
    }

    return { ...planSnap.data(), id: planId };
  } catch (error) {
    console.error("Error getting plan:", error);
    return null;
  }
};

/**
 * ユーザーのアクティブなプランを取得
 */
export const getActivePlan = async (
  userId: string
): Promise<(PlanDocument & { id: string }) | null> => {
  try {
    const plansRef = collections.plans;
    const q = query(
      plansRef,
      where("userId", "==", userId),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    return { ...docSnap.data(), id: docSnap.id };
  } catch (error) {
    console.error("Error getting active plan:", error);
    return null;
  }
};

/**
 * ユーザーのpending状態のプランを取得
 */
export const getPendingPlan = async (
  userId: string
): Promise<(PlanDocument & { id: string }) | null> => {
  try {
    const plansRef = collections.plans;
    const q = query(
      plansRef,
      where("userId", "==", userId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    return { ...docSnap.data(), id: docSnap.id };
  } catch (error) {
    console.error("Error getting pending plan:", error);
    return null;
  }
};

/**
 * 食事のステータスを更新
 */
export const updateMealStatus = async (
  planId: string,
  date: string,
  mealType: "breakfast" | "lunch" | "dinner",
  status: MealStatus
): Promise<void> => {
  try {
    const planRef = docRefs.plan(planId);
    await updateDoc(planRef, {
      [`days.${date}.meals.${mealType}.status`]: status,
      updatedAt: serverTimestamp(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (error) {
    console.error("Error updating meal status:", error);
    throw error;
  }
};

/**
 * 特定の1食の詳細情報を更新（材料・手順の保存用）
 */
export const updateMealSlot = async (
  planId: string,
  date: string,
  mealType: "breakfast" | "lunch" | "dinner",
  updates: Partial<MealSlot>
): Promise<void> => {
  try {
    const planRef = docRefs.plan(planId);
    
    // ネストされたオブジェクトの個別フィールドを更新
    const firebaseUpdates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      firebaseUpdates[`days.${date}.meals.${mealType}.${key}`] = value;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(planRef, firebaseUpdates as any);
  } catch (error) {
    console.error("Error updating meal slot:", error);
    throw error;
  }
};

/**
 * 特定の1食を差し替え
 */
export const swapMeal = async (
  planId: string,
  date: string,
  mealType: "breakfast" | "lunch" | "dinner",
  newMeal: MealSlot
): Promise<void> => {
  try {
    const planRef = docRefs.plan(planId);
    await updateDoc(planRef, {
      [`days.${date}.meals.${mealType}`]: {
        ...newMeal,
        status: "swapped",
      },
      updatedAt: serverTimestamp(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (error) {
    console.error("Error swapping meal:", error);
    throw error;
  }
};

/**
 * プランのステータスを更新
 */
export const updatePlanStatus = async (
  planId: string,
  status: PlanStatus
): Promise<void> => {
  try {
    const planRef = docRefs.plan(planId);
    await updateDoc(planRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating plan status:", error);
    throw error;
  }
};

/**
 * プランの一部日程を更新（リフレッシュ用）
 */
export const updatePlanDays = async (
  planId: string,
  daysToUpdate: Record<string, DayPlan>
): Promise<void> => {
  try {
    const planRef = docRefs.plan(planId);
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    Object.entries(daysToUpdate).forEach(([date, dayPlan]) => {
      updates[`days.${date}`] = dayPlan;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(planRef, updates as any);
  } catch (error) {
    console.error("Error updating plan days:", error);
    throw error;
  }
};

/**
 * 今日のメニューを取得
 */
export const getTodaysMeals = async (
  userId: string
): Promise<DayPlan | null> => {
  try {
    const activePlan = await getActivePlan(userId);
    if (!activePlan) {
      return null;
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return activePlan.days[today] || null;
  } catch (error) {
    console.error("Error getting today's meals:", error);
    return null;
  }
};
