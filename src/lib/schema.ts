/**
 * FaveFit v2 - Firestore スキーマ定義
 * 設計書 v2 に基づく型定義
 */

import { Timestamp, FieldValue } from "firebase/firestore";

// ========================================
// Users Collection: users/{userId}
// ========================================

export interface UserProfile {
  displayName: string;
  currentWeight: number;
  targetWeight: number;
  deadline: Timestamp;
  cheatDayFrequency: "weekly" | "biweekly";
  isGuest: boolean;
  createdAt: Timestamp | FieldValue;

  // 追加の身体情報
  age?: number;
  gender?: "male" | "female" | "other";
  height_cm?: number;
  activity_level?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal?: "lose" | "maintain" | "gain";
  allergies?: string[];
  favoriteIngredients?: string[];
  cookingSkillLevel?: "beginner" | "intermediate" | "advanced";
  availableTime?: "short" | "medium" | "long";
}

export interface UserNutrition {
  dailyCalories: number;
  pfc: {
    protein: number;
    fat: number;
    carbs: number;
  };
  strategySummary?: string;
  preferences?: {
    lossPaceKgPerMonth?: number;
    maintenanceAdjustKcalPerDay?: number;
    gainPaceKgPerMonth?: number;
    gainStrategy?: "lean" | "standard" | "aggressive";
    macroPreset?: "balanced" | "lowfat" | "lowcarb" | "highprotein";
  };
}

export interface LearnedPreferences {
  cuisines: Record<string, number>; // { japanese: 25, korean: 10 }
  flavorProfile: Record<string, number>; // { light: 15, heavy: 2 }
  dislikedIngredients: string[];
}

export interface UserDocument {
  profile: UserProfile;
  nutrition: UserNutrition;
  learnedPreferences: LearnedPreferences;
  onboardingCompleted: boolean;
  // プラン作成状態: creating=作成中, null/undefined=未作成or完了
  planCreationStatus?: "creating" | null;
  planCreationStartedAt?: Timestamp | FieldValue;
  // プラン拒否時のフィードバック（次のプラン生成時に使用）
  planRejectionFeedback?: string;
  updatedAt: Timestamp | FieldValue;
}

// ========================================
// Plans Collection: plans/{planId}
// ========================================

export type MealStatus = "planned" | "completed" | "swapped";
export type PlanStatus = "pending" | "active" | "completed" | "archived";

export interface MealSlot {
  recipeId: string;
  title: string;
  status: MealStatus;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  tags?: string[];
  imageUrl?: string;
  ingredients?: string[];
  steps?: string[];
}

export interface DayPlan {
  isCheatDay: boolean;
  meals: {
    breakfast: MealSlot;
    lunch: MealSlot;
    dinner: MealSlot;
  };
  totalNutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

export interface PlanDocument {
  userId: string;
  startDate: string; // YYYY-MM-DD
  status: PlanStatus;
  days: Record<string, DayPlan>; // key: "YYYY-MM-DD"
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ========================================
// Recipe History: recipeHistory/{userId}/recipes/{recipeId}
// ========================================

export interface RecipeHistoryItem {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  ingredients: string[];
  steps: string[];
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  proposedAt: Timestamp;
  cookedAt: Timestamp | null; // null = 未作成
  isFavorite: boolean;
}

// ========================================
// Favorite Recipes: favoriteRecipes/{userId}/recipes/{recipeId}
// ========================================

export interface FavoriteRecipe {
  id: string;
  title: string;
  tags: string[];
  addedAt: Timestamp;
  cookedCount: number;
}

// ========================================
// Shopping Lists: shoppingLists/{planId}
// ========================================

export interface ShoppingItem {
  ingredient: string;
  amount: string;
  category: string; // 野菜, 肉, 調味料 etc.
  checked: boolean;
}

export interface ShoppingListDocument {
  planId: string;
  items: ShoppingItem[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ========================================
// Market Prices: marketPrices/latest (Global)
// ========================================

export interface MarketPriceEntry {
  priceScore: number; // 1-10 (1=安価, 10=高価)
  updatedAt: Timestamp;
}

export interface MarketPriceDocument {
  prices: Record<string, MarketPriceEntry>;
  lastBatchRun: Timestamp;
}
