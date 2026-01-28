/**
 * FaveFit v2 - プランサービス
 * プラン生成・リフレッシュに関するビジネスロジック
 */

import { z } from "zod";
import {
  PlanGeneratorInput,
  runPartialPlanGenerator,
  PLAN_GENERATOR_INSTRUCTIONS,
  generateMealPlan,
  runExplorationAnalysis,
  runSimpleBoredomAnalysis,
  geminiFlash,
  getTelemetryConfig,
} from "@/ai";
import { generateObject } from "ai";
import { buildRecipePrompt, runRecipeCreator } from "@/ai/agents/recipe-creator";
import { getOrCreateUser, setPlanCreating, setPlanCreated } from "@/lib/db/firestore/userRepository";
import { createPlan, updatePlanStatus, getActivePlan, updatePlanDays, getPlan, updateMealSlot } from "@/lib/plan";
import { createShoppingList } from "@/lib/shoppingList";
import { getFavorites } from "@/lib/recipeHistory";
import { DayPlan, MealSlot, ShoppingItem, IngredientItem } from "@/lib/schema";
import { calculatePersonalizedMacroGoals } from "@/lib/tools/calculateMacroGoals";
import { calculateMealTargets } from "@/lib/tools/mealNutritionCalculator";

interface MealInfo {
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  title: string;
  tags: string[];
}

export interface GeneratePlanRequest {
  userId: string;
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

export interface RefreshPlanRequest {
  userId: string;
  forceDates?: string[];
}

export interface RefreshPlanResponse {
  refreshed: boolean;
  refreshedDates?: string[];
  boredomScore?: number;
  analysis?: unknown;
  message: string;
}

export interface RefreshPlanWithFeedbackRequest {
  userId: string;
  goodRecipes: string[];
  badRecipes: string[];
}

export interface RefreshPlanWithFeedbackResponse {
  refreshed: boolean;
  refreshedDates: string[];
  message: string;
}

export interface SuggestBoredomRecipesRequest {
  userId: string;
}

export interface SuggestBoredomRecipesResponse {
  recipes: Array<{
    recipeId: string;
    title: string;
    description: string;
    tags: string[];
    nutrition: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
  }>;
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

  generatePlanBackground(userId, userDoc).catch((error) => {
    console.error(`[generatePlan] Background plan generation failed for user ${userId}:`, error);
    if (error instanceof Error) {
      console.error(`[generatePlan] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    // エラーが発生した場合でも、ステータスをクリア
    setPlanCreated(userId).catch((statusError) => {
      console.error(`[generatePlan] Failed to clear plan creation status after error:`, statusError);
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
  userDoc: Awaited<ReturnType<typeof getOrCreateUser>>
) {
  if (!userDoc) return;

  try {
    const favorites = await getFavorites(userId);
    const favoriteRecipes = favorites.map((f) => ({ id: f.id, title: f.title, tags: f.tags }));
    const cheapIngredients = ["キャベツ", "もやし", "鶏むね肉", "卵", "豆腐"]; // TODO: DBから取得
    const startDate = new Date().toISOString().split("T")[0];

    // 既存のプランをアーカイブ
    const existingPlan = await getActivePlan(userId);
    if (existingPlan) {
      await updatePlanStatus(existingPlan.id, "archived");
    }

    // 栄養目標の計算
    const { targetCalories, pfc } = calculateUserMacroGoals(userDoc);
    const mealTargets = calculateMealTargets({ calories: targetCalories, ...pfc });

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
      cheatDayFrequency: userDoc.profile.cheatDayFrequency || "weekly",
      startDate,
    };

    // Vercel AI SDK ワークフローを実行
    const result = await generateMealPlan({
      input,
      feedbackText: userDoc.planRejectionFeedback || "",
      mealTargets,
      dislikedIngredients: userDoc.learnedPreferences.dislikedIngredients,
      userId,
    });

    if (!result.isValid && result.invalidMealsCount > 0) {
      console.warn(`[generatePlanBackground] ${result.invalidMealsCount} meals had fallback applied`);
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
function calculateUserMacroGoals(userDoc: NonNullable<Awaited<ReturnType<typeof getOrCreateUser>>>) {
  const profile = userDoc.profile;
  const hasRequiredProfileData =
    profile.age &&
    profile.gender &&
    (profile.gender === "male" || profile.gender === "female") &&
    profile.height_cm &&
    profile.currentWeight &&
    profile.activity_level &&
    profile.goal;

  if (!hasRequiredProfileData) {
    return {
      targetCalories: 1800,
      pfc: { protein: 100, fat: 50, carbs: 200 }
    };
  }

  // preferences がある場合は決定論の計算を優先
  if (userDoc.nutrition?.preferences) {
    return calculatePersonalizedMacroGoals({
      age: profile.age!,
      gender: profile.gender as "male" | "female",
      height_cm: profile.height_cm!,
      weight_kg: profile.currentWeight,
      activity_level: profile.activity_level!,
      goal: profile.goal!,
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
      pfc: userDoc.nutrition.pfc
    };
  }

  // プロファイル情報から標準計算
  return calculatePersonalizedMacroGoals({
    age: profile.age!,
    gender: profile.gender as "male" | "female",
    height_cm: profile.height_cm!,
    weight_kg: profile.currentWeight,
    activity_level: profile.activity_level!,
    goal: profile.goal!,
  });
}


/**
 * ユーザーの拒否フィードバックをクリア
 */
async function clearUserRejectionFeedback(userId: string) {
  try {
    const { db } = await import("@/lib/db/firestore/client");
    const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", userId), { planRejectionFeedback: null, updatedAt: serverTimestamp() });
  } catch {
    // フィードバッククリアの失敗は無視
  }
}

/**
 * プランをリフレッシュ（自動分析）
 */
export async function refreshPlan(
  request: RefreshPlanRequest
): Promise<RefreshPlanResponse> {
  const { userId, forceDates } = request;

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    throw new Error("ユーザーが見つかりません");
  }

  const activePlan = await getActivePlan(userId);
  if (!activePlan) {
    throw new Error("アクティブなプランがありません");
  }

  const recentMeals: MealInfo[] = [];
  for (const [date, dayPlan] of Object.entries(activePlan.days)) {
    for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
      const meal = dayPlan.meals[mealType];
      recentMeals.push({
        date,
        mealType,
        title: meal.title,
        tags: meal.tags || [],
      });
    }
  }

  let datesToRefresh: string[] = forceDates || [];

  if (!forceDates || forceDates.length === 0) {
    const analyzerMessageText = `以下の食事履歴を分析して、飽き率と改善提案を教えてください。JSON形式で出力してください。

【食事履歴】
${JSON.stringify(recentMeals, null, 2)}

【ユーザー嗜好】
${JSON.stringify(userDoc.learnedPreferences, null, 2)}`;

    const analysisResult = await runSimpleBoredomAnalysis(
      analyzerMessageText,
      userId
    );

    if (analysisResult.boredomScore >= 60 || analysisResult.shouldRefresh) {
      datesToRefresh = analysisResult.refreshDates || [];

      if (datesToRefresh.length === 0) {
        const today = new Date().toISOString().split("T")[0];
        datesToRefresh = Object.keys(activePlan.days)
          .filter((d) => d > today)
          .slice(0, 3);
      }
    } else {
      return {
        refreshed: false,
        boredomScore: analysisResult.boredomScore,
        analysis: analysisResult.analysis,
        message: "現在のプランは十分に変化があります",
      };
    }
  }

  if (datesToRefresh.length === 0) {
    return {
      refreshed: false,
      message: "リフレッシュ対象の日がありません",
    };
  }

  const updatedDays = await generatePlanDays(
    userId,
    userDoc,
    datesToRefresh,
    recentMeals.map((m) => m.title)
  );

  await updatePlanDays(activePlan.id, updatedDays);

  return {
    refreshed: true,
    refreshedDates: Object.keys(updatedDays),
    message: `${Object.keys(updatedDays).length}日分のプランをリフレッシュしました`,
  };
}

/**
 * フィードバック付きプランリフレッシュ
 */
export async function refreshPlanWithFeedback(
  request: RefreshPlanWithFeedbackRequest
): Promise<RefreshPlanWithFeedbackResponse> {
  const { userId, goodRecipes, badRecipes } = request;

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    throw new Error("ユーザーが見つかりません");
  }

  const activePlan = await getActivePlan(userId);
  if (!activePlan) {
    throw new Error("アクティブなプランがありません");
  }

  const analyzerMessageText = `以下のgood/bad選択結果から、ユーザーの現在の気分・好みを解析し、新しい探索プロファイルを提案してください。

【good と選ばれたレシピ】
${JSON.stringify(goodRecipes, null, 2)}

【bad と選ばれたレシピ】
${JSON.stringify(badRecipes, null, 2)}

【現在の嗜好プロファイル】
${JSON.stringify(userDoc.learnedPreferences, null, 2)}`;

  const analysisResult = await runExplorationAnalysis(
    analyzerMessageText,
    userId
  );

  const today = new Date().toISOString().split("T")[0];
  const futureDates = Object.keys(activePlan.days)
    .filter((d) => d > today)
    .slice(0, 7);

  if (futureDates.length === 0) {
    return {
      refreshed: false,
      refreshedDates: [],
      message: "リフレッシュ対象の日がありません",
    };
  }

  const updatedDays = await generatePlanDaysWithProfile(
    userId,
    userDoc,
    futureDates,
    analysisResult.explorationProfile
  );

  await updatePlanDays(activePlan.id, updatedDays);

  return {
    refreshed: true,
    refreshedDates: Object.keys(updatedDays),
    message:
      analysisResult.message ||
      `${Object.keys(updatedDays).length}日分のプランをリフレッシュしました`,
  };
}

/**
 * 飽き防止用5レシピ提案
 */
export async function suggestBoredomRecipes(
  request: SuggestBoredomRecipesRequest
): Promise<SuggestBoredomRecipesResponse> {
  const { userId } = request;

  const userDoc = await getOrCreateUser(userId);
  if (!userDoc) {
    throw new Error("ユーザーが見つかりません");
  }

  const activePlan = await getActivePlan(userId);
  if (!activePlan) {
    throw new Error("アクティブなプランがありません");
  }

  const existingTitles = new Set<string>();
  for (const dayPlan of Object.values(activePlan.days)) {
    for (const meal of Object.values(dayPlan.meals)) {
      existingTitles.add(meal.title);
    }
  }

  const messageText = `飽き防止のため、既存のプランとは異なる新ジャンル・新テイストのレシピを5つ提案してください。
既存のレシピとは全く異なる方向性のものを選んでください。

【栄養目標】
- カロリー: ${userDoc.nutrition.dailyCalories} kcal/日
- タンパク質: ${userDoc.nutrition.pfc.protein}g
- 脂質: ${userDoc.nutrition.pfc.fat}g
- 炭水化物: ${userDoc.nutrition.pfc.carbs}g

【避けるべき食材】
${userDoc.learnedPreferences.dislikedIngredients.join(", ") || "なし"}

【既存のレシピ（これらとは異なるものを提案）】
${Array.from(existingTitles).slice(0, 20).join(", ")}`;

  const suggestRecipesSchema = z.object({
    recipes: z.array(z.object({
      recipeId: z.string(),
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      nutrition: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbs: z.number(),
      }),
    })),
  });

  const { object: parsedResult } = await generateObject({
    model: geminiFlash,
    system: PLAN_GENERATOR_INSTRUCTIONS,
    prompt: messageText,
    schema: suggestRecipesSchema,
    experimental_telemetry: getTelemetryConfig("suggest-boredom-recipes", userId),
  });

  const recipes = (parsedResult.recipes || []).slice(0, 5);

  return { recipes };
}

/**
 * プラン日付を生成（ヘルパー関数）
 */
async function generatePlanDays(
  userId: string,
  userDoc: NonNullable<Awaited<ReturnType<typeof getOrCreateUser>>>,
  dates: string[],
  existingTitles: string[]
): Promise<Record<string, DayPlan>> {
  const planMessageText = `以下の日付の食事プランを新しく生成してください。既存のメニューとは異なるものにしてください。

【対象日】
${dates.join(", ")}

【栄養目標】
- カロリー: ${userDoc.nutrition.dailyCalories} kcal
- タンパク質: ${userDoc.nutrition.pfc.protein}g
- 脂質: ${userDoc.nutrition.pfc.fat}g
- 炭水化物: ${userDoc.nutrition.pfc.carbs}g

【避けるべき食材】
${userDoc.learnedPreferences.dislikedIngredients.join(", ") || "なし"}

【既存のメニュー（これらとは異なるものを提案）】
${existingTitles.join(", ")}`;

  // 構造化出力を使用してスキーマに準拠したデータを取得（可変長の日付配列用）
  const planResult1 = await runPartialPlanGenerator(planMessageText, userId);

  return convertPlanResultToDays(planResult1);
}

/**
 * 探索プロファイルに基づいてプラン日付を生成（ヘルパー関数）
 */
async function generatePlanDaysWithProfile(
  userId: string,
  userDoc: NonNullable<Awaited<ReturnType<typeof getOrCreateUser>>>,
  dates: string[],
  explorationProfile?: {
    prioritizeCuisines?: string[];
    prioritizeFlavors?: string[];
    avoidCuisines?: string[];
  }
): Promise<Record<string, DayPlan>> {
  const planMessageText = `以下の日付の食事プランを、新しい探索プロファイルに基づいて生成してください。

【対象日】
${dates.join(", ")}

【栄養目標】
- カロリー: ${userDoc.nutrition.dailyCalories} kcal
- タンパク質: ${userDoc.nutrition.pfc.protein}g
- 脂質: ${userDoc.nutrition.pfc.fat}g
- 炭水化物: ${userDoc.nutrition.pfc.carbs}g

【探索プロファイル（優先する）】
- ジャンル: ${explorationProfile?.prioritizeCuisines?.join(", ") || "なし"}
- 味付け: ${explorationProfile?.prioritizeFlavors?.join(", ") || "なし"}

【避けるべきジャンル】
${explorationProfile?.avoidCuisines?.join(", ") || "なし"}

【避けるべき食材】
${userDoc.learnedPreferences.dislikedIngredients.join(", ") || "なし"}`;

  // 構造化出力を使用してスキーマに準拠したデータを取得（可変長の日付配列用）
  const planResult2 = await runPartialPlanGenerator(planMessageText, userId);

  return convertPlanResultToDays(planResult2);
}

/**
 * プラン結果をDayPlanに変換（ヘルパー関数）
 */
function convertPlanResultToDays(planResult: {
  days?: Array<{
    date: string;
    isCheatDay?: boolean;
    breakfast: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: IngredientItem[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    };
    lunch: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: IngredientItem[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    };
    dinner: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: IngredientItem[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    };
  }>;
}): Record<string, DayPlan> {
  const updatedDays: Record<string, DayPlan> = {};

  for (const day of planResult.days || []) {
    const date = day.date;

    const convertMeal = (meal: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: IngredientItem[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    }): MealSlot => {
      // nutritionの各フィールドを検証・変換（防御的プログラミング）
      const safeNutrition = {
        calories: Number(meal.nutrition?.calories) || 0,
        protein: Number(meal.nutrition?.protein) || 0,
        fat: Number(meal.nutrition?.fat) || 0,
        carbs: Number(meal.nutrition?.carbs) || 0,
      };

      // ingredientsが文字列配列の場合とIngredientItem配列の場合に対応
      let ingredients: IngredientItem[] = [];
      if (meal.ingredients && meal.ingredients.length > 0) {
        if (typeof meal.ingredients[0] === 'string') {
          // 古い形式（文字列配列）の場合
          ingredients = (meal.ingredients as unknown as string[]).map(ingredientStr => {
            const match = ingredientStr.match(/^(.+?):\s*(.+)$/);
            if (match) {
              return { name: match[1].trim(), amount: match[2].trim() };
            }
            return { name: ingredientStr.trim(), amount: "" }; // 分量がない場合
          });
        } else {
          // 新しい形式（IngredientItem配列）の場合
          ingredients = meal.ingredients as IngredientItem[];
        }
      }

      return {
        recipeId: meal.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: meal.title,
        status: "planned",
        nutrition: safeNutrition,
        tags: meal.tags || [],
        ingredients: ingredients,
        steps: meal.steps || [],
      };
    };

    const breakfast = convertMeal(day.breakfast);
    const lunch = convertMeal(day.lunch);
    const dinner = convertMeal(day.dinner);

    // totalNutrition計算時のNaNチェック（防御的プログラミング）
    const totalNutrition = {
      calories:
        (Number(breakfast.nutrition.calories) || 0) +
        (Number(lunch.nutrition.calories) || 0) +
        (Number(dinner.nutrition.calories) || 0),
      protein:
        (Number(breakfast.nutrition.protein) || 0) +
        (Number(lunch.nutrition.protein) || 0) +
        (Number(dinner.nutrition.protein) || 0),
      fat:
        (Number(breakfast.nutrition.fat) || 0) +
        (Number(lunch.nutrition.fat) || 0) +
        (Number(dinner.nutrition.fat) || 0),
      carbs:
        (Number(breakfast.nutrition.carbs) || 0) +
        (Number(lunch.nutrition.carbs) || 0) +
        (Number(dinner.nutrition.carbs) || 0),
    };

    updatedDays[date] = {
      isCheatDay: day.isCheatDay || false,
      meals: { breakfast, lunch, dinner },
      totalNutrition,
    };
  }

  return updatedDays;
}

/**
 * レシピ詳細を1つ生成（内部関数）
 */
async function generateSingleRecipeDetail(
  userId: string,
  planId: string,
  date: string,
  mealType: "breakfast" | "lunch" | "dinner",
  meal: MealSlot
): Promise<void> {
  // 既に詳細が存在する場合はスキップ
  if (meal.ingredients && meal.ingredients.length > 0 && meal.steps && meal.steps.length > 0) {
    return;
  }

  const userDoc = await getOrCreateUser(userId);
  const prompt = buildRecipePrompt(userDoc, meal.title, meal.nutrition);

  const aiResult = await runRecipeCreator(prompt, userId);

  const ingredients = aiResult.ingredients.map(
    (i: { name: string; amount: string }) => ({ name: i.name, amount: i.amount })
  );
  const steps = aiResult.instructions;

  const updates = {
    ingredients,
    steps: steps || [],
  };

  await updateMealSlot(planId, date, mealType, updates);
}

/**
 * レシピ詳細をバッチ処理で生成
 * 5食ずつ、並列3件、バッチ間に1秒待機
 */
async function generateRecipeDetailsBatch(
  userId: string,
  planId: string,
  days: Record<string, DayPlan>
): Promise<void> {
  const mealTypes = ["breakfast", "lunch", "dinner"] as const;
  
  const recipeQueue = Object.entries(days).flatMap(([date, dayPlan]) =>
    mealTypes
      .map((mealType) => ({ date, mealType, meal: dayPlan.meals[mealType] }))
      .filter(({ meal }) => !meal.ingredients || meal.ingredients.length === 0)
  );

  if (recipeQueue.length === 0) {
    return;
  }

  const BATCH_SIZE = 5;
  const CONCURRENT_LIMIT = 3;

  for (let i = 0; i < recipeQueue.length; i += BATCH_SIZE) {
    const batch = recipeQueue.slice(i, i + BATCH_SIZE);
    const concurrentBatch = batch.slice(0, CONCURRENT_LIMIT);

    // 並列実行（制限あり）
    const promises = concurrentBatch.map(({ date, mealType, meal }) =>
      generateSingleRecipeDetail(userId, planId, date, mealType, meal).catch((error) => {
        console.error(`Failed to generate recipe for ${date} ${mealType}:`, error);
        return null; // エラーでも続行
      })
    );

    await Promise.allSettled(promises);

    // バッチ間に待機（APIレート制限対策）
    if (i + BATCH_SIZE < recipeQueue.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
    }
  }
}

/**
 * レシピデータから買い物リストを生成
 */
async function generateShoppingListFromRecipes(
  planId: string,
  days: Record<string, DayPlan>
): Promise<void> {
  // TypeScriptによる高度な事前集計
  // Map<食材名, { amounts: string[]; category: string }>
  const ingredientGroups = new Map<string, { amounts: string[]; category: string }>();

  Object.values(days)
    .filter(dayPlan => !dayPlan.isCheatDay)
    .flatMap(dayPlan => Object.values(dayPlan.meals))
    .flatMap(meal => meal.ingredients ?? [])
    .forEach(ing => {
      const normalizedName = ing.name.trim();
      const amount = ing.amount.trim();

      if (ingredientGroups.has(normalizedName)) {
        ingredientGroups.get(normalizedName)!.amounts.push(amount);
      } else {
        ingredientGroups.set(normalizedName, {
          amounts: [amount],
          category: categorizeIngredient(normalizedName, amount),
        });
      }
    });

  // 集計結果を ShoppingItem 形式に変換
  const shoppingItems: ShoppingItem[] = [];

  for (const [name, data] of ingredientGroups.entries()) {
    const totalAmount = sumAmounts(data.amounts);
    shoppingItems.push({
      ingredient: name,
      amount: totalAmount,
      category: data.category,
      checked: false,
    });
  }

  // Firestoreに保存
  if (shoppingItems.length > 0) {
    await createShoppingList(planId, shoppingItems);
  }
}

/**
 * 分量の数値合算ロジック (TypeScript)
 */
function sumAmounts(amounts: string[]): string {
  const summary: Record<string, number> = {};
  const strings: string[] = [];

  for (const amt of amounts) {
    // 数値と単位を分離 (例: "200g", "1.5個", "1/2個")
    const match = amt.match(/^(\d*(?:\.\d+)?|\d+\/\d+)\s*([a-zA-Zぁ-んァ-ヶー一-龠]*)$/);

    if (match) {
      const [, valueStr, unit] = match;
      if (valueStr) {
        const value = parseValue(valueStr);
        summary[unit] = (summary[unit] || 0) + value;
      } else {
        // 数値がないが単位（または文字列）のみの場合（例：「適量」）
        strings.push(amt);
      }
    } else {
      strings.push(amt);
    }
  }

  const results = Object.entries(summary).map(([unit, val]) => {
    // 小数点以下の整形 (0.5 => 1/2 のような変換はせず、0.5のまま)
    const displayVal = Number.isInteger(val) ? val.toString() : val.toFixed(1).replace(/\.0$/, "");
    return `${displayVal}${unit}`;
  });

  // 重複した文字列を排除して結合
  const uniqueStrings = Array.from(new Set(strings));
  return [...results, ...uniqueStrings].join(", ");
}

/**
 * 文字列の数値をパース（分数対応）
 */
function parseValue(valStr: string): number {
  if (valStr.includes("/")) {
    const [num, den] = valStr.split("/").map(Number);
    if (den === 0) return 0;
    return num / den;
  }
  return parseFloat(valStr) || 0;
}

/**
 * 食材カテゴリの簡易判定
 */
function categorizeIngredient(name: string, amount?: string): string {
  const lowerName = name.toLowerCase();
  const lowerAmount = amount?.toLowerCase() || "";

  // 常備品・基本調味料の判定（分量の表現で判断）
  const stapleMeasureKeywords = ["大さじ", "小さじ", "少々", "適量", "少量", "たっぷり", "ひとつまみ"];
  if (stapleMeasureKeywords.some((k) => lowerAmount.includes(k))) {
    return "基本調味料・常備品 (お家にあれば購入不要)";
  }

  const meatKeywords = ["肉", "牛", "豚", "鶏", "ひき肉", "ベーコン", "ハム", "ウィンナー", "ソーセージ", "ささみ", "チャーシュー"];
  const fishKeywords = ["魚", "鮭", "マグロ", "海老", "イカ", "タコ", "貝", "刺身", "鯖", "鯛", "あゆ", "ぶり", "カツオ", "しらす", "アサリ"];
  const veggieKeywords = ["野菜", "玉ねぎ", "人参", "キャベツ", "レタス", "トマト", "ブロッコリー", "ピーマン", "なす", "ほうれん草", "じゃがいも", "大根", "きのこ", "椎茸", "えのき", "セロリ", "パプリカ", "もやし", "キュウリ", "きゅうり", "ニラ", "パセリ", "刻みネギ", "バジル"];
  const fruitKeywords = ["果物", "フルーツ", "レモン", "バナナ", "ブルーベリー", "イチゴ", "リンゴ", "みかん", "アボカド"];
  const grainKeywords = ["パスタ", "ラザニア", "パン", "米", "ご飯", "飯", "うどん", "そば", "麺", "ピザ生地", "トースト", "全粒粉"];
  const dairyEggKeywords = ["卵", "チーズ", "牛乳", "ヨーグルト", "バター", "生クリーム"];
  const soyKeywords = ["豆腐", "納豆", "豆乳", "油揚げ", "厚揚げ"];
  const condimentKeywords = ["塩", "胡椒", "醤油", "味噌", "油", "だし", "砂糖", "酢", "みりん", "酒", "マヨネーズ", "ケチャップ", "ソース", "コンソメ", "めんつゆ", "ドレッシング", "ポン酢", "はちみつ", "シロップ", "片栗粉", "豆板醤", "生姜", "わさび", "にんにく", "練りごま", "ハーブ"];
  const processedKeywords = ["プロテイン", "わかめ", "海苔", "寿司", "茶碗蒸し"];

  if (meatKeywords.some((k) => lowerName.includes(k))) return "肉類";
  if (fishKeywords.some((k) => lowerName.includes(k))) return "魚介類";
  if (veggieKeywords.some((k) => lowerName.includes(k))) return "野菜・ハーブ類";
  if (fruitKeywords.some((k) => lowerName.includes(k))) return "果実類";
  if (dairyEggKeywords.some((k) => lowerName.includes(k))) return "卵・乳製品";
  if (soyKeywords.some((k) => lowerName.includes(k))) return "大豆製品";
  if (grainKeywords.some((k) => lowerName.includes(k))) return "主食・穀類";
  if (condimentKeywords.some((k) => lowerName.includes(k))) return "調味料・甘味料";
  if (processedKeywords.some((k) => lowerName.includes(k))) return "加工食品・その他";

  return "その他";
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
    message: "プランを承認しました。レシピ詳細を生成中です。",
  };
}

/**
 * プラン承認後のレシピ詳細生成（バックグラウンド処理）
 */
async function approvePlanAndGenerateDetails(
  userId: string,
  planId: string,
  days: Record<string, DayPlan>
): Promise<void> {
  try {
    // レシピ詳細をバッチ処理で生成
    await generateRecipeDetailsBatch(userId, planId, days);

    // Firestoreから最新のプランデータを再取得（ingredients/stepsが追加されている）
    const updatedPlan = await getPlan(planId);
    if (!updatedPlan) {
      throw new Error("更新されたプランが見つかりません");
    }

    // 買い物リストを生成（最新のdaysデータを使用）
    await generateShoppingListFromRecipes(planId, updatedPlan.days);
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
    const { db } = await import("@/lib/db/firestore/client");
    const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      planRejectionFeedback: feedback.trim(),
      updatedAt: serverTimestamp(),
    });
  }

  return {
    success: true,
    message: "プランを拒否しました。",
  };
}
