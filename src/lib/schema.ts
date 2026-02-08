/**
 * FaveFit v2 - Firestore スキーマ定義
 * 設計書 v2 に基づく型定義
 */

import { Timestamp, FieldValue } from "firebase/firestore";

// ========================================
// Mood & Cuisine Types
// ========================================

export type CuisineGenre =
  | "和食"
  | "洋食"
  | "中華"
  | "イタリアン"
  | "エスニック"
  | "その他";

export interface Mood {
  genre: CuisineGenre;
  tasteBalance: number; // 0: さっぱり, 100: こってり
  freeText?: string;
}

// ========================================
// Users Collection: users/{userId}
// ========================================

export interface UserProfile {
  // アイデンティティ（基本情報）
  identity: {
    displayName: string;
    isGuest: boolean;
    createdAt: Timestamp | FieldValue;
  };

  // フィジカル（身体・健康情報）
  physical: {
    age?: number;
    gender?: "male" | "female" | "other";
    height_cm?: number;
    currentWeight: number;
    targetWeight: number;
    deadline: Timestamp;
    goal?: "lose" | "maintain" | "gain";
    allergies?: string[];
    favoriteIngredients?: string[];
  };

  // ライフスタイル（生活習慣・設定）
  lifestyle: {
    activityLevel?:
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active";
    cookingSkillLevel?: "beginner" | "intermediate" | "advanced";
    availableTime?: "short" | "medium" | "long";
    cheatDayFrequency: "weekly";
    maxCookingTimePerMeal?: {
      breakfast?: number;
      lunch?: number;
      dinner?: number;
    };
    timeSavingPriority?: "breakfast" | "lunch" | "dinner";
    // 食事スロットごとの設定モードと入力テキスト
    mealSettings?: {
      breakfast: { mode: "auto" | "fixed" | "custom"; text: string };
      lunch: { mode: "auto" | "fixed" | "custom"; text: string };
      dinner: { mode: "auto" | "fixed" | "custom"; text: string };
    };
    fridgeIngredients?: IngredientItem[];
    mealPrepConfig?: {
      dayOfWeek: number; // 0-6 (Sunday to Saturday)
      servings: number; // 何食分作るか
    };
    // 現状の食生活（適応型プランニング用）
    currentDiet?: {
      breakfast?: string;
      lunch?: string;
      dinner?: string;
      snack?: string;
    };
  };
}

export interface UserNutrition {
  bmr?: number;
  tdee?: number;
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
  cuisines: Record<string, number>;
  flavorProfile: Record<string, number>;
  dislikedIngredients: string[];
}

export interface UserDocument {
  profile: UserProfile;
  nutrition: UserNutrition;
  learnedPreferences: LearnedPreferences;
  onboardingCompleted: boolean;
  planCreationStatus?: "creating" | null;
  planCreationStartedAt?: Timestamp | FieldValue;
  planRejectionFeedback?: string;
  updatedAt: Timestamp | FieldValue;
}

// ========================================
// Plans Collection: plans/{planId}
// ========================================

export type MealStatus = "planned" | "completed" | "swapped";
export type PlanStatus = "pending" | "active" | "completed" | "archived";

export interface IngredientItem {
  name: string;
  amount: string;
}

export interface MealSlot {
  recipeId?: string;
  title: string;
  status: MealStatus;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  tags: string[];
  imageUrl?: string;
  ingredients?: IngredientItem[];
  steps?: string[];
}

export interface DayPlan {
  isCheatDay: boolean;
  meals: {
    breakfast: MealSlot;
    lunch: MealSlot;
    dinner: MealSlot;
    snack?: MealSlot; // 目標カロリー調整用の間食
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
  days: Record<string, DayPlan>;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ... 以降の型定義（RecipeHistoryItemなど）は変更なしのため省略または維持
export interface RecipeHistoryItem {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  ingredients: IngredientItem[];
  steps: string[];
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  proposedAt: Timestamp;
  cookedAt: Timestamp | null;
  isFavorite: boolean;
}

export interface FavoriteRecipe {
  id: string;
  title: string;
  tags: string[];
  addedAt: Timestamp;
  cookedCount: number;
}

export interface ShoppingItem {
  ingredient: string;
  amount: string;
  category: string;
  checked: boolean;
}

export interface ShoppingListDocument {
  planId: string;
  items: ShoppingItem[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface MarketPriceEntry {
  priceScore: number;
  updatedAt: Timestamp;
}

export interface MarketPriceDocument {
  prices: Record<string, MarketPriceEntry>;
  lastBatchRun: Timestamp;
}
