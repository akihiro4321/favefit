/**
 * FaveFit v2 - プランサービス
 * プラン生成・リフレッシュに関するビジネスロジック
 */

import {
  PlanGeneratorInput,
  generateMealPlan,
  buildRecipePrompt,
  runRecipeCreator,
} from "@/server/ai";
import { getOrCreateUser, setPlanCreating, setPlanCreated } from "@/server/db/firestore/userRepository";
import {
  createPlan,
  updatePlanStatus,
  getActivePlan as getActivePlanRepo,
  getPendingPlan as getPendingPlanRepo,
  getPlan,
  updateMealSlot
} from "@/server/db/firestore/planRepository";
import { createShoppingList } from "@/server/db/firestore/shoppingListRepository";
import { getFavorites } from "@/server/db/firestore/recipeHistoryRepository";
import { DayPlan, MealSlot, ShoppingItem, PlanDocument } from "@/lib/schema";
import { calculatePersonalizedMacroGoals } from "@/lib/tools/calculateMacroGoals";
import { calculateMealTargets } from "@/lib/tools/mealNutritionCalculator";


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
    const existingPlanResult = await getActivePlanRepo(userId);
    if (existingPlanResult) {
      await updatePlanStatus(existingPlanResult.id!, "archived");
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
      cheatDayFrequency: userDoc.profile.lifestyle.cheatDayFrequency || "weekly",
      startDate,
      fixedMeals: userDoc.profile.lifestyle.fixedMeals,
      mealConstraints: userDoc.profile.lifestyle.mealConstraints,
      mealPrep: userDoc.profile.lifestyle.mealPrepConfig
        ? {
            prepDay: startDate,
            servings: userDoc.profile.lifestyle.mealPrepConfig.servings,
          }
        : undefined,
      fridgeIngredients: userDoc.profile.lifestyle.fridgeIngredients,
      lifestyle: {
        availableTime: userDoc.profile.lifestyle.availableTime,
        maxCookingTime: userDoc.profile.lifestyle.maxCookingTimePerMeal?.lunch,
      },
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
      pfc: { protein: 100, fat: 50, carbs: 200 }
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
      pfc: userDoc.nutrition.pfc
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
 * ユーザーの拒否フィードバックをクリア
 */
async function clearUserRejectionFeedback(userId: string) {
  try {
    const { db } = await import("@/server/db/firestore/client");
    const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", userId), { planRejectionFeedback: null, updatedAt: serverTimestamp() });
  } catch {
    // フィードバッククリアの失敗は無視
  }
}


/**
 * プラン結果をDayPlanに変換（ヘルパー関数）
 */

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
    const { db } = await import("@/server/db/firestore/client");
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
