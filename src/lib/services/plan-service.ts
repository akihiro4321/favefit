/**
 * FaveFit v2 - プランサービス
 * プラン生成・リフレッシュに関するビジネスロジック
 */

import { mastra } from "@/mastra";
import { PlanGeneratorInput, PlanGeneratorOutputSchema, PartialPlanOutputSchema } from "@/mastra/agents/plan-generator";
import { getOrCreateUser, setPlanCreating, setPlanCreated } from "@/lib/user";
import { createPlan, updatePlanStatus, getActivePlan, updatePlanDays, getPlan, updateMealSlot } from "@/lib/plan";
import { createShoppingList } from "@/lib/shoppingList";
import { getFavorites } from "@/lib/recipeHistory";
import { DayPlan, MealSlot, ShoppingItem } from "@/lib/schema";
import { buildRecipePrompt } from "@/mastra/agents/recipe-creator";
import { calculateMacroGoals, calculatePersonalizedMacroGoals } from "@/lib/tools/calculateMacroGoals";

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
 * 14日間プランを生成（非同期）
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

  generatePlanBackground(userId, userDoc).catch((error) => {
    console.error("Background plan generation failed:", error);
    setPlanCreated(userId).catch(console.error);
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
    const favoriteRecipes = favorites.map((f) => ({
      id: f.id,
      title: f.title,
      tags: f.tags,
    }));

    const cheapIngredients = ["キャベツ", "もやし", "鶏むね肉", "卵", "豆腐"];
    const startDate = new Date().toISOString().split("T")[0];

    const existingPlan = await getActivePlan(userId);
    if (existingPlan) {
      await updatePlanStatus(existingPlan.id, "archived");
    }

    // 栄養目標の動的計算
    let targetCalories: number;
    let pfc: { protein: number; fat: number; carbs: number };

    const profile = userDoc.profile;
    const hasRequiredProfileData =
      profile.age &&
      profile.gender &&
      (profile.gender === "male" || profile.gender === "female") &&
      profile.height_cm &&
      profile.currentWeight &&
      profile.activity_level &&
      profile.goal;

    if (hasRequiredProfileData) {
      // preferences がある場合は決定論の計算を優先
      if (userDoc.nutrition?.preferences) {
        const macroGoals = calculatePersonalizedMacroGoals({
          age: profile.age!,
          gender: profile.gender as "male" | "female",
          height_cm: profile.height_cm!,
          weight_kg: profile.currentWeight,
          activity_level: profile.activity_level!,
          goal: profile.goal!,
          preferences: userDoc.nutrition.preferences,
        });
        targetCalories = macroGoals.targetCalories;
        pfc = macroGoals.pfc;
      } else if (
        userDoc.nutrition?.dailyCalories &&
        userDoc.nutrition.dailyCalories > 0 &&
        userDoc.nutrition.pfc?.protein &&
        userDoc.nutrition.pfc.protein > 0
      ) {
        // 既存のnutritionデータを使用
        targetCalories = userDoc.nutrition.dailyCalories;
        pfc = userDoc.nutrition.pfc;
      } else {
        // プロファイル情報から動的に計算（従来ロジック）
        const macroGoals = calculateMacroGoals({
          age: profile.age!,
          gender: profile.gender as "male" | "female",
          height_cm: profile.height_cm!,
          weight_kg: profile.currentWeight,
          activity_level: profile.activity_level!,
          goal: profile.goal!,
        });
        targetCalories = macroGoals.targetCalories;
        pfc = macroGoals.pfc;
      }
    } else {
      // プロファイル情報が不足している場合はデフォルト値を使用
      targetCalories = 1800;
      pfc = { protein: 100, fat: 50, carbs: 200 };
    }

    const input: PlanGeneratorInput = {
      targetCalories,
      pfc,
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

    const agent = mastra.getAgent("planGenerator");

    const feedbackText = userDoc.planRejectionFeedback
      ? `\n\n【前回のプラン拒否時のフィードバック】
${userDoc.planRejectionFeedback}

このフィードバックを考慮して、より適切なプランを生成してください。`
      : "";

    const messageText = `以下の情報に基づいて14日間の食事プランと買い物リストを生成してください。

【ユーザー情報】
${JSON.stringify(input, null, 2)}${feedbackText}`;

    // 構造化出力を使用してスキーマに準拠したデータを取得
    const result = await agent.generate(messageText, {
      structuredOutput: {
        schema: PlanGeneratorOutputSchema,
        // Gemini 2.5モデルではjsonPromptInjectionが必要な場合がある
        jsonPromptInjection: true,
      },
    });

    // 構造化出力が有効な場合はresult.objectから直接取得
    let parsedResult;
    if (result.object) {
      parsedResult = result.object;
    } else if (result.text) {
      // フォールバック: テキストからJSONを抽出
      console.warn(`[Plan Generation] Structured output not available, falling back to text parsing`);
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[Plan Generation] Failed to extract JSON from text:", result.text.substring(0, 500));
        throw new Error("AI応答からJSONを抽出できませんでした");
      }
      parsedResult = JSON.parse(jsonMatch[0]);
    } else {
      console.error("[Plan Generation] No object or text in response");
      throw new Error("AI応答が無効です");
    }

    // スキーマ検証（PlanGeneratorOutputSchemaで検証）
    if (!parsedResult.days || !Array.isArray(parsedResult.days)) {
      throw new Error("AI応答にdays配列が含まれていません");
    }

    // 14日間のプランであることを検証（構造化出力で保証されるが、フォールバックとして残す）
    if (parsedResult.days.length !== 14) {
      console.error(`プランは14日間である必要がありますが、${parsedResult.days.length}日間でした。`, parsedResult);
      throw new Error(`プラン生成エラー: 14日間のプランが必要ですが、${parsedResult.days.length}日間のプランが返されました。`);
    }

    const days: Record<string, DayPlan> = {};

    for (const day of parsedResult.days || []) {
      const date = day.date;

      const convertMeal = (meal: {
        recipeId: string;
        title: string;
        tags?: string[];
        ingredients?: string[];
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

        return {
          recipeId:
            meal.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: meal.title,
          status: "planned",
          nutrition: safeNutrition,
          tags: meal.tags || [],
          ingredients: meal.ingredients || [],
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

      days[date] = {
        isCheatDay: day.isCheatDay || false,
        meals: { breakfast, lunch, dinner },
        totalNutrition,
      };
    }

    // pending状態でプランを作成（承認後にレシピ詳細を生成）
    const planId = await createPlan(userId, startDate, days, "pending");

    // プラン生成完了後、フィードバックをクリア
    if (userDoc.planRejectionFeedback) {
      const { db } = await import("@/lib/firebase");
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        planRejectionFeedback: null,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error generating plan:", error);
    // エラーの種類に応じた処理
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  } finally {
    await setPlanCreated(userId);
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
    const analyzerAgent = mastra.getAgent("boredomAnalyzer");

    const analyzerMessageText = `以下の食事履歴を分析して、飽き率と改善提案を教えてください。JSON形式で出力してください。

【食事履歴】
${JSON.stringify(recentMeals, null, 2)}

【ユーザー嗜好】
${JSON.stringify(userDoc.learnedPreferences, null, 2)}`;

    const analyzerResult = await analyzerAgent.generate(analyzerMessageText);

    // 構造化出力が有効な場合は直接取得、そうでない場合はJSONをパース
    let analysisResult;
    if (analyzerResult.text) {
      const analyzerMatch = analyzerResult.text.match(/\{[\s\S]*\}/);
      if (!analyzerMatch) {
        throw new Error("Boredom analysis failed to return JSON");
      }
      analysisResult = JSON.parse(analyzerMatch[0]);
    } else if (analyzerResult.object) {
      analysisResult = analyzerResult.object;
    } else {
      throw new Error("AI応答が無効です");
    }

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

  const analyzerAgent = mastra.getAgent("boredomAnalyzer");

  const analyzerMessageText = `以下のgood/bad選択結果から、ユーザーの現在の気分・好みを解析し、新しい探索プロファイルを提案してください。

【good と選ばれたレシピ】
${JSON.stringify(goodRecipes, null, 2)}

【bad と選ばれたレシピ】
${JSON.stringify(badRecipes, null, 2)}

【現在の嗜好プロファイル】
${JSON.stringify(userDoc.learnedPreferences, null, 2)}`;

  const analyzerResult = await analyzerAgent.generate(analyzerMessageText);

  // 構造化出力が有効な場合は直接取得、そうでない場合はJSONをパース
  let analysisResult;
  if (analyzerResult.text) {
    const analyzerMatch = analyzerResult.text.match(/\{[\s\S]*\}/);
    if (!analyzerMatch) {
      throw new Error("Boredom analysis failed to return JSON");
    }
    analysisResult = JSON.parse(analyzerMatch[0]);
  } else if (analyzerResult.object) {
    analysisResult = analyzerResult.object;
  } else {
    throw new Error("AI応答が無効です");
  }

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

  const planAgent = mastra.getAgent("planGenerator");

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
${Array.from(existingTitles).slice(0, 20).join(", ")}

【出力形式】
以下のJSON形式で5つのレシピを出力してください：
{
  "recipes": [
    {
      "recipeId": "recipe-1",
      "title": "レシピ名",
      "description": "なぜこのレシピを提案したか（新ジャンル・新テイストの説明）",
      "tags": ["タグ1", "タグ2"],
      "nutrition": {
        "calories": 500,
        "protein": 30,
        "fat": 15,
        "carbs": 50
      }
    }
  ]
}`;

  const result = await planAgent.generate(messageText);

  // 構造化出力が有効な場合は直接取得、そうでない場合はJSONをパース
  let parsedResult;
  if (result.text) {
    const planMatch = result.text.match(/\{[\s\S]*\}/);
    if (!planMatch) {
      throw new Error("Recipe suggestions failed to return JSON");
    }
    parsedResult = JSON.parse(planMatch[0]);
  } else if (result.object) {
    parsedResult = result.object;
  } else {
    throw new Error("AI応答が無効です");
  }

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
  const planAgent = mastra.getAgent("planGenerator");

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
  const planResult1 = await planAgent.generate(planMessageText, {
    structuredOutput: {
      schema: PartialPlanOutputSchema,
      jsonPromptInjection: true,
    },
  });

  // 構造化出力が有効な場合はresult.objectから直接取得
  let parsedPlanResult1;
  if (planResult1.object) {
    parsedPlanResult1 = planResult1.object;
  } else if (planResult1.text) {
    // フォールバック: テキストからJSONを抽出
    const planMatch = planResult1.text.match(/\{[\s\S]*\}/);
    if (!planMatch) {
      throw new Error("Plan generation failed to return JSON");
    }
    parsedPlanResult1 = JSON.parse(planMatch[0]);
  } else {
    throw new Error("AI応答が無効です");
  }

  return convertPlanResultToDays(parsedPlanResult1);
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
  const planAgent = mastra.getAgent("planGenerator");

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
  const planResult2 = await planAgent.generate(planMessageText, {
    structuredOutput: {
      schema: PartialPlanOutputSchema,
      jsonPromptInjection: true,
    },
  });

  // 構造化出力が有効な場合はresult.objectから直接取得
  let parsedPlanResult2;
  if (planResult2.object) {
    parsedPlanResult2 = planResult2.object;
  } else if (planResult2.text) {
    // フォールバック: テキストからJSONを抽出
    const planMatch = planResult2.text.match(/\{[\s\S]*\}/);
    if (!planMatch) {
      throw new Error("New plan generation failed to return JSON");
    }
    parsedPlanResult2 = JSON.parse(planMatch[0]);
  } else {
    throw new Error("AI応答が無効です");
  }

  return convertPlanResultToDays(parsedPlanResult2);
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
      ingredients?: string[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    };
    lunch: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: string[];
      steps?: string[];
      nutrition: { calories: number; protein: number; fat: number; carbs: number };
    };
    dinner: {
      recipeId?: string;
      title: string;
      tags?: string[];
      ingredients?: string[];
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
      ingredients?: string[];
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

      return {
        recipeId: meal.recipeId || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: meal.title,
        status: "planned",
        nutrition: safeNutrition,
        tags: meal.tags || [],
        ingredients: meal.ingredients || [],
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

  const agent = mastra.getAgent("recipeCreator");

  const result = await agent.generate(prompt);

  // 構造化出力が有効な場合は直接取得、そうでない場合はJSONをパース
  let aiResult;
  if (result.text) {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI応答からレシピ詳細JSONを抽出できませんでした");
    }
    aiResult = JSON.parse(jsonMatch[0]);
  } else if (result.object) {
    aiResult = result.object;
  } else {
    throw new Error("AI応答が無効です");
  }

  const ingredients = aiResult.ingredients.map(
    (i: { name: string; amount: string }) => `${i.name}: ${i.amount}`
  );
  const steps = aiResult.instructions || aiResult.steps;

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
  // すべてのレシピをキューに追加
  const recipeQueue: Array<{
    date: string;
    mealType: "breakfast" | "lunch" | "dinner";
    meal: MealSlot;
  }> = [];

  for (const [date, dayPlan] of Object.entries(days)) {
    for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
      const meal = dayPlan.meals[mealType];
      // 既に詳細がある場合はスキップ
      if (!meal.ingredients || meal.ingredients.length === 0) {
        recipeQueue.push({ date, mealType, meal });
      }
    }
  }

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
 * レシピ詳細から買い物リストを生成
 */
async function generateShoppingListFromRecipes(
  planId: string,
  days: Record<string, DayPlan>
): Promise<void> {
  // すべてのレシピの材料を集計
  const ingredientMap = new Map<string, { amount: string; category: string }>();

  for (const dayPlan of Object.values(days)) {
    for (const meal of Object.values(dayPlan.meals)) {
      if (meal.ingredients && meal.ingredients.length > 0) {
        for (const ingredientStr of meal.ingredients) {
          // "材料名: 分量" の形式をパース
          const match = ingredientStr.match(/^(.+?):\s*(.+)$/);
          if (match) {
            const [, name, amount] = match;
            const normalizedName = name.trim();

            // 既に存在する場合は統合（分量を合計）
            if (ingredientMap.has(normalizedName)) {
              const existing = ingredientMap.get(normalizedName)!;
              // 分量の統合は簡易的に「,」で結合（実際のアプリではより高度な統合が必要）
              existing.amount = `${existing.amount}, ${amount.trim()}`;
            } else {
              // カテゴリの推定（簡易版）
              const category = categorizeIngredient(normalizedName);
              ingredientMap.set(normalizedName, {
                amount: amount.trim(),
                category,
              });
            }
          }
        }
      }
    }
  }

  // ShoppingItemに変換
  const shoppingItems: ShoppingItem[] = Array.from(ingredientMap.entries()).map(
    ([ingredient, { amount, category }]) => ({
      ingredient,
      amount,
      category,
      checked: false,
    })
  );

  // カテゴリ別にソート
  const categoryOrder: Record<string, number> = {
    野菜: 1,
    肉: 2,
    魚: 3,
    調味料: 4,
    その他: 99,
  };

  shoppingItems.sort((a, b) => {
    const orderA = categoryOrder[a.category] || 99;
    const orderB = categoryOrder[b.category] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.ingredient.localeCompare(b.ingredient);
  });

  await createShoppingList(planId, shoppingItems);
}

/**
 * 材料名からカテゴリを推定（簡易版）
 */
function categorizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase();

  if (
    lower.includes("野菜") ||
    lower.includes("キャベツ") ||
    lower.includes("もやし") ||
    lower.includes("トマト") ||
    lower.includes("玉ねぎ") ||
    lower.includes("にんじん") ||
    lower.includes("きゅうり") ||
    lower.includes("レタス") ||
    lower.includes("ほうれん草")
  ) {
    return "野菜";
  }

  if (
    lower.includes("肉") ||
    lower.includes("鶏") ||
    lower.includes("豚") ||
    lower.includes("牛") ||
    lower.includes("ハム") ||
    lower.includes("ベーコン")
  ) {
    return "肉";
  }

  if (
    lower.includes("魚") ||
    lower.includes("サーモン") ||
    lower.includes("マグロ") ||
    lower.includes("サバ") ||
    lower.includes("イワシ")
  ) {
    return "魚";
  }

  if (
    lower.includes("醤油") ||
    lower.includes("塩") ||
    lower.includes("胡椒") ||
    lower.includes("砂糖") ||
    lower.includes("油") ||
    lower.includes("酢") ||
    lower.includes("みそ") ||
    lower.includes("だし")
  ) {
    return "調味料";
  }

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

    // 買い物リストを生成
    await generateShoppingListFromRecipes(planId, days);
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
    const { db } = await import("@/lib/firebase");
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
