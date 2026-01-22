/**
 * FaveFit v2 - プランサービス
 * 14日間プランの作成・取得・更新
 */

import { db } from "./firebase";
import {
  collection,
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
import {
  PlanDocument,
  DayPlan,
  MealSlot,
  MealStatus,
  PlanStatus,
} from "./schema";

// ========================================
// プラン操作
// ========================================

/**
 * 新規プランを作成
 */
export const createPlan = async (
  userId: string,
  startDate: string,
  days: Record<string, DayPlan>
): Promise<string> => {
  try {
    const plansRef = collection(db, "plans");
    const planDoc = doc(plansRef);

    const newPlan: PlanDocument = {
      userId,
      startDate,
      status: "active",
      days,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(planDoc, newPlan);
    return planDoc.id;
  } catch (error) {
    console.error("Error creating plan:", error);
    throw error;
  }
};

/**
 * プランを取得
 */
export const getPlan = async (planId: string): Promise<PlanDocument | null> => {
  try {
    const planRef = doc(db, "plans", planId);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      return null;
    }

    return { ...planSnap.data(), id: planId } as PlanDocument & { id: string };
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
    const plansRef = collection(db, "plans");
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

    const doc = querySnapshot.docs[0];
    return { ...doc.data(), id: doc.id } as PlanDocument & { id: string };
  } catch (error) {
    console.error("Error getting active plan:", error);
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
    const planRef = doc(db, "plans", planId);
    await updateDoc(planRef, {
      [`days.${date}.meals.${mealType}.status`]: status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating meal status:", error);
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
    const planRef = doc(db, "plans", planId);
    await updateDoc(planRef, {
      [`days.${date}.meals.${mealType}`]: {
        ...newMeal,
        status: "swapped",
      },
      updatedAt: serverTimestamp(),
    });
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
    const planRef = doc(db, "plans", planId);
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
    const planRef = doc(db, "plans", planId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    Object.entries(daysToUpdate).forEach(([date, dayPlan]) => {
      updates[`days.${date}`] = dayPlan;
    });

    await updateDoc(planRef, updates);
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
