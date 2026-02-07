"use client";

/**
 * オンボーディングページ
 * 新規ユーザーが初回ログイン時にプロフィール・栄養目標・食の好みを設定するウィザード形式の画面
 * 5ステップで構成: プロフィール → 身体情報 → 栄養目標確認 → 好み設定 → プラン作成
 */

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  User,
  Activity,
  Zap,
  UtensilsCrossed,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  Clock,
} from "lucide-react";
import type { LearnedPreferences, UserDocument } from "@/lib/schema";
import { Timestamp } from "firebase/firestore";
import { PlanCreatingScreen } from "@/components/plan-creating-screen";
import { NutritionPreferencesForm } from "@/components/nutrition-preferences-form";
import type { CalculateNutritionRequest } from "@/lib/schemas/user";

// 各ステップを識別するための定数オブジェクト
const ONBOARDING_STEP = {
  PROFILE: 1,        // 基本プロフィール
  BODY_INFO: 2,      // 身体情報
  NUTRITION_REVIEW: 3, // 栄養目標の確認
  CURRENT_DIET: 4,     // 現状の食生活（追加）
  PREFERENCES: 5,    // 食の好み設定
  MEAL_SETTINGS: 6,  // 食事のこだわり設定
  PLAN_CREATION: 7,  // プラン作成開始
} as const;

// 画面遷移上のステップ総数
const TOTAL_STEPS = 7;

// セレクトボックス共通のTailwindクラス
const SELECT_CLASS_NAME = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const DEFAULT_DURATION = 7; // 将来的に可変にするためのデフォルト値

/**
 * オンボーディングで収集するフォームデータの型定義
 * 各ステップで入力される情報をまとめて管理
 */
type MealSettingMode = "auto" | "fixed" | "custom";
type MealSetting = {
  mode: MealSettingMode;
  text: string;
};

type OnboardingFormData = {
  // Step 1: 基本プロフィール
  displayName: string;       // ニックネーム
  currentWeight: number;     // 現在の体重 (kg)
  targetWeight: number;      // 目標体重 (kg)
  deadline: string;          // 目標達成期限 (YYYY-MM-DD形式)
  cheatDayFrequency: "weekly" | "biweekly"; // チートデイの頻度

  // Step 2: 身体情報（栄養計算に使用）
  age: number;
  gender: "male" | "female" | "other";
  height_cm: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain"; // 減量・維持・増量
  lossPaceKgPerMonth: number;          // 月あたりの減量ペース
  maintenanceAdjustKcalPerDay: number; // 維持時のカロリー調整
  gainPaceKgPerMonth: number;          // 月あたりの増量ペース
  gainStrategy: "lean" | "standard" | "aggressive"; // 増量戦略
  macroPreset: "balanced" | "lowfat" | "lowcarb" | "highprotein"; // マクロ栄養素のプリセット

  // Step 4: 現状の食生活（適応型プランニング用）
  currentDiet: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  };

  // Step 5: 食の好み
  allergies: string[];            // アレルギー・苦手な食材
  favoriteIngredients: string[];  // 好きな食材
  preferredCuisines: string[];    // 好きな料理ジャンル
  flavorProfile: "light" | "medium" | "rich"; // 味付けの好み（さっぱり〜こってり）
  cookingSkillLevel: "beginner" | "intermediate" | "advanced"; // 料理スキル
  availableTime: "short" | "medium" | "long"; // 調理時間の目安

  // Step 6: 食事のこだわり設定（Anchor & Fill 対応）
  mealSettings: {
    breakfast: MealSetting;
    lunch: MealSetting;
    dinner: MealSetting;
  };
};

// フォームデータの初期値（日本人の平均的な値をデフォルトに設定）
const DEFAULT_FORM_DATA: OnboardingFormData = {
  displayName: "",
  currentWeight: 65,
  targetWeight: 60,
  deadline: "",
  cheatDayFrequency: "weekly",
  age: 30,
  gender: "male",
  height_cm: 170,
  activity_level: "moderate",
  goal: "lose",
  lossPaceKgPerMonth: 1,
  maintenanceAdjustKcalPerDay: 0,
  gainPaceKgPerMonth: 0.5,
  gainStrategy: "lean",
  macroPreset: "balanced",
  currentDiet: {
    breakfast: "",
    lunch: "",
    dinner: "",
    snack: "",
  },
  allergies: [],
  favoriteIngredients: [],
  preferredCuisines: [],
  flavorProfile: "medium",
  cookingSkillLevel: "intermediate",
  availableTime: "medium",
  mealSettings: {
    breakfast: { mode: "auto", text: "" },
    lunch: { mode: "auto", text: "" },
    dinner: { mode: "auto", text: "" },
  },
};

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * 様々な形式のdeadlineをinput[type="date"]用の文字列に変換
 * Firestore Timestamp, Date, 文字列に対応
 */
const getDeadlineInput = (deadline?: unknown): string => {
  if (!deadline) return "";

  // Firestore Timestamp（toDateメソッドを持つオブジェクト）
  if (typeof deadline === "object" && deadline !== null && "toDate" in deadline && typeof (deadline as { toDate: () => Date }).toDate === "function") {
    return (deadline as { toDate: () => Date }).toDate().toISOString().split("T")[0];
  }

  // Date オブジェクト
  if (deadline instanceof Date) {
    return deadline.toISOString().split("T")[0];
  }

  // 文字列（すでにYYYY-MM-DD形式など）
  if (typeof deadline === "string") {
    return deadline.split("T")[0];
  }

  return "";
};

/**
 * 性別を男女のみに限定（栄養計算APIの制約のため）
 */
const getBinaryGender = (gender: OnboardingFormData["gender"]) => {
  if (gender === "other") {
    throw new Error("gender must be male or female");
  }
  return gender;
};

/**
 * ユーザーの学習済み好みから料理ジャンルを抽出
 */
const getPreferredCuisines = (learnedPreferences?: LearnedPreferences) => {
  return Object.keys(learnedPreferences?.cuisines || {}).map((cuisine) => {
    return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
  });
};

/**
 * ユーザーの学習済み好みから味付けの好みを判定
 */
const getFlavorProfile = (learnedPreferences?: LearnedPreferences) => {
  const flavors = Object.keys(learnedPreferences?.flavorProfile || {});
  if (flavors.includes("light")) return "light";
  if (flavors.includes("rich")) return "rich";
  return "medium";
};

/**
 * 既存のユーザープロフィールからフォームの初期値を構築
 * 再オンボーディング時に以前の設定を引き継ぐために使用
 */
const buildProfileOverrides = (profile?: Partial<UserDocument> | null): Partial<OnboardingFormData> => {
  if (!profile?.profile) return {};
  const base = profile.profile;
  return {
    displayName: base.identity?.displayName || DEFAULT_FORM_DATA.displayName,
    currentWeight: base.physical?.currentWeight || DEFAULT_FORM_DATA.currentWeight,
    targetWeight: base.physical?.targetWeight || DEFAULT_FORM_DATA.targetWeight,
    deadline: getDeadlineInput(base.physical?.deadline ?? null),
    cheatDayFrequency: base.lifestyle?.cheatDayFrequency || DEFAULT_FORM_DATA.cheatDayFrequency,
    age: base.physical?.age || DEFAULT_FORM_DATA.age,
    gender: base.physical?.gender || DEFAULT_FORM_DATA.gender,
    height_cm: base.physical?.height_cm || DEFAULT_FORM_DATA.height_cm,
    activity_level:
      base.lifestyle?.activityLevel || DEFAULT_FORM_DATA.activity_level,
    goal: base.physical?.goal || DEFAULT_FORM_DATA.goal,
    lossPaceKgPerMonth: profile.nutrition?.preferences?.lossPaceKgPerMonth ?? DEFAULT_FORM_DATA.lossPaceKgPerMonth,
    maintenanceAdjustKcalPerDay:
      profile.nutrition?.preferences?.maintenanceAdjustKcalPerDay ?? DEFAULT_FORM_DATA.maintenanceAdjustKcalPerDay,
    gainPaceKgPerMonth: profile.nutrition?.preferences?.gainPaceKgPerMonth ?? DEFAULT_FORM_DATA.gainPaceKgPerMonth,
    gainStrategy: profile.nutrition?.preferences?.gainStrategy || DEFAULT_FORM_DATA.gainStrategy,
    macroPreset: profile.nutrition?.preferences?.macroPreset || DEFAULT_FORM_DATA.macroPreset,
    allergies: base.physical?.allergies || DEFAULT_FORM_DATA.allergies,
    favoriteIngredients: base.physical?.favoriteIngredients || DEFAULT_FORM_DATA.favoriteIngredients,
    preferredCuisines: getPreferredCuisines(profile.learnedPreferences),
    flavorProfile: getFlavorProfile(profile.learnedPreferences),
    cookingSkillLevel: base.lifestyle?.cookingSkillLevel || DEFAULT_FORM_DATA.cookingSkillLevel,
    availableTime: base.lifestyle?.availableTime || DEFAULT_FORM_DATA.availableTime,
    mealSettings: {
      breakfast: base.lifestyle?.fixedMeals?.breakfast
        ? { mode: "fixed", text: base.lifestyle.fixedMeals.breakfast.title }
        : base.lifestyle?.mealConstraints?.breakfast
        ? { mode: "custom", text: base.lifestyle.mealConstraints.breakfast }
        : { mode: "auto", text: "" },
      lunch: base.lifestyle?.fixedMeals?.lunch
        ? { mode: "fixed", text: base.lifestyle.fixedMeals.lunch.title }
        : base.lifestyle?.mealConstraints?.lunch
        ? { mode: "custom", text: base.lifestyle.mealConstraints.lunch }
        : { mode: "auto", text: "" },
      dinner: base.lifestyle?.fixedMeals?.dinner
        ? { mode: "fixed", text: base.lifestyle.fixedMeals.dinner.title }
        : base.lifestyle?.mealConstraints?.dinner
        ? { mode: "custom", text: base.lifestyle.mealConstraints.dinner }
        : { mode: "auto", text: "" },
    },
  };
};

// =============================================================================
// メインコンポーネント
// =============================================================================

export default function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  // --- ステート管理 ---
  const [currentStep, setCurrentStep] = useState<number>(ONBOARDING_STEP.PROFILE); // 現在のステップ
  const [submitting, setSubmitting] = useState(false); // 送信中フラグ
  // 栄養目標の結果を保持
  const [nutritionResult, setNutritionResult] = useState<{
    bmr: number;
    tdee: number;
    dailyCalories: number;
    pfc: { protein: number; fat: number; carbs: number };
    strategySummary?: string;
  } | null>(null);

  // プラン作成中かどうか
  const isPlanCreating = profile?.planCreationStatus === "creating";

  // フォームデータ（既存プロフィールから初期化）
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM_DATA);

  // タグ入力用の一時的な入力値
  const [allergyInput, setAllergyInput] = useState("");   // アレルギー入力欄
  const [favoriteInput, setFavoriteInput] = useState(""); // 好きな食材入力欄

  // --- 副作用（useEffect） ---

  // プロフィールから初期値を設定（既存ユーザーの再オンボーディング対応）
  useEffect(() => {
    if (profile?.profile) {
      const overrides = buildProfileOverrides(profile);
      setFormData((prev) => ({ ...prev, ...overrides }));

      // 既に栄養情報がある場合はセット
      if (profile.nutrition?.dailyCalories) {
        setNutritionResult({
          bmr: profile.nutrition.bmr || 0,
          tdee: profile.nutrition.tdee || 0,
          dailyCalories: profile.nutrition.dailyCalories,
          pfc: profile.nutrition.pfc || { protein: 0, fat: 0, carbs: 0 },
          strategySummary: profile.nutrition.strategySummary,
        });
      }
    }
  }, [profile]);

  // 未ログインユーザーはトップページへリダイレクト
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // オンボーディング完了済みユーザーは/homeへリダイレクト
  useEffect(() => {
    if (!loading && profile?.onboardingCompleted) {
      router.push("/home");
    }
  }, [loading, profile?.onboardingCompleted, router]);

  // プラン作成中の場合は5秒ごとにステータスをポーリング
  // 完了したら自動的に画面が更新される
  useEffect(() => {
    if (isPlanCreating) {
      const interval = setInterval(() => {
        refreshProfile();
      }, 5000); // 5秒ごとにチェック
      return () => clearInterval(interval);
    }
  }, [isPlanCreating, refreshProfile]);

  // --- API呼び出し関数 ---

  /**
   * 入力された身体情報をもとに栄養目標を計算
   * Step 2 → Step 3 への遷移時に呼び出される
   */
  const calculateNutrition = async () => {
    const payload = {
      userId: user!.uid,
      profile: {
        age: formData.age,
        gender: getBinaryGender(formData.gender),
        height_cm: formData.height_cm,
        weight_kg: formData.currentWeight,
        activity_level: formData.activity_level,
        goal: formData.goal,
      },
      preferences: {
        lossPaceKgPerMonth: formData.lossPaceKgPerMonth,
        maintenanceAdjustKcalPerDay: formData.maintenanceAdjustKcalPerDay,
        gainPaceKgPerMonth: formData.gainPaceKgPerMonth,
        gainStrategy: formData.gainStrategy,
        macroPreset: formData.macroPreset,
      },
    } satisfies CalculateNutritionRequest;

    const response = await fetch("/api/user/calculate-nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    setNutritionResult(result.data.nutrition);
    setCurrentStep(ONBOARDING_STEP.NUTRITION_REVIEW);
  };

  /**
   * プロフィールと食の好みをFirestoreに保存
   * Step 4 → Step 5 への遷移時に呼び出される
   */
  const saveProfileAndPreferences = async () => {
    const deadlineDate = formData.deadline
      ? new Date(formData.deadline + "T00:00:00")
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const deadlineTimestamp = Timestamp.fromDate(deadlineDate);

    await fetch('/api/user/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user!.uid,
        profileData: {
          identity: {
            displayName: formData.displayName || "ユーザー",
            isGuest: false,
          },
          physical: {
            currentWeight: formData.currentWeight,
            targetWeight: formData.targetWeight,
            deadline: deadlineTimestamp,
            age: formData.age,
            gender: formData.gender,
            height_cm: formData.height_cm,
            goal: formData.goal,
            allergies: formData.allergies,
            favoriteIngredients: formData.favoriteIngredients,
          },
          lifestyle: {
            activityLevel: formData.activity_level,
            cheatDayFrequency: formData.cheatDayFrequency,
            cookingSkillLevel: formData.cookingSkillLevel,
            availableTime: formData.availableTime,
            mealSettings: formData.mealSettings,
            mealConstraints: {
              ...(formData.mealSettings.breakfast.mode === "custom" ? { breakfast: formData.mealSettings.breakfast.text } : {}),
              ...(formData.mealSettings.lunch.mode === "custom" ? { lunch: formData.mealSettings.lunch.text } : {}),
              ...(formData.mealSettings.dinner.mode === "custom" ? { dinner: formData.mealSettings.dinner.text } : {}),
            },
            fixedMeals: {
              ...(formData.mealSettings.breakfast.mode === "fixed" ? { breakfast: { title: formData.mealSettings.breakfast.text, status: "planned", nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0 }, tags: [] } } : {}),
              ...(formData.mealSettings.lunch.mode === "fixed" ? { lunch: { title: formData.mealSettings.lunch.text, status: "planned", nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0 }, tags: [] } } : {}),
              ...(formData.mealSettings.dinner.mode === "fixed" ? { dinner: { title: formData.mealSettings.dinner.text, status: "planned", nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0 }, tags: [] } } : {}),
            },
          },
        },
      }),
    });

    if (formData.preferredCuisines.length > 0 || formData.flavorProfile) {
      const initialCuisines: Record<string, number> = {};
      formData.preferredCuisines.forEach((cuisine) => {
        initialCuisines[cuisine.toLowerCase()] = 10;
      });

      const initialFlavorProfile: Record<string, number> = {};
      if (formData.flavorProfile === "light") {
        initialFlavorProfile["light"] = 10;
        initialFlavorProfile["sour"] = 5;
      } else if (formData.flavorProfile === "rich") {
        initialFlavorProfile["rich"] = 10;
        initialFlavorProfile["heavy"] = 5;
      } else {
        initialFlavorProfile["medium"] = 10;
      }

      // learnedPreferencesを更新するためのAPIエンドポイントが必要
      // 現状はprofileData内で扱えないため、一旦コメントアウト
      // TODO: update-learned-preferencesエンドポイントを追加
      console.log("TODO: Update learned preferences", { initialCuisines, initialFlavorProfile });
    }

    setCurrentStep(ONBOARDING_STEP.PLAN_CREATION);
  };

  // --- イベントハンドラー ---

  /**
   * 「次へ」ボタン押下時の処理
   * ステップに応じてAPI呼び出しや画面遷移を行う
   */
  const handleNext = async () => {
    if (currentStep === ONBOARDING_STEP.BODY_INFO) {
      setSubmitting(true);
      try {
        await calculateNutrition();
      } catch (error) {
        console.error("Nutrition calculation failed:", error);
        alert("栄養目標の計算に失敗しました。");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (currentStep === ONBOARDING_STEP.MEAL_SETTINGS) {
      setSubmitting(true);
      try {
        await saveProfileAndPreferences();
      } catch (error) {
        console.error("Profile save failed:", error);
        alert("プロフィールの保存に失敗しました。");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (currentStep === ONBOARDING_STEP.CURRENT_DIET) {
      const { breakfast, lunch, dinner } = formData.currentDiet;
      if (!breakfast.trim() || !lunch.trim() || !dinner.trim()) {
        alert("普段の食事内容（朝食・昼食・夕食）をすべて入力してください。より良いプラン作成のために必要です。");
        return;
      }
    }

    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  /** 「戻る」ボタン押下時の処理 */
  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  /**
   * プラン作成を開始
   * 1. オンボーディング完了フラグを立てる
   * 2. バックグラウンドでプラン生成APIを呼び出す
   */
  const handleCreatePlan = async () => {
    setSubmitting(true);
    try {
      // 1. オンボーディング完了をマーク
      await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.uid }),
      });

      // 2. プラン生成をリクエスト（バックグラウンドで実行される）
      const response = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.uid }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // 3. プロフィールを更新（作成中ステータスが反映される）
      await refreshProfile();
    } catch (error) {
      console.error("Plan creation failed:", error);
      alert("プラン作成の開始に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  /** アレルギー・苦手な食材をリストに追加 */
  const addAllergy = () => {
    if (allergyInput.trim() && !formData.allergies.includes(allergyInput.trim())) {
      setFormData({
        ...formData,
        allergies: [...formData.allergies, allergyInput.trim()],
      });
      setAllergyInput("");
    }
  };

  /** 好きな食材をリストに追加 */
  const addFavorite = () => {
    if (favoriteInput.trim() && !formData.favoriteIngredients.includes(favoriteInput.trim())) {
      setFormData({
        ...formData,
        favoriteIngredients: [...formData.favoriteIngredients, favoriteInput.trim()],
      });
      setFavoriteInput("");
    }
  };

  // --- レンダリング ---

  // ローディング中はスピナーを表示
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未ログイン時は何も表示しない（リダイレクト処理中）
  if (!user) return null;

  // プラン作成中は専用の待機画面を表示
  if (isPlanCreating) {
    return (
      <PlanCreatingScreen
        showBackButton={true}
        onBack={() => router.push("/home")}
        duration={DEFAULT_DURATION}
      />
    );
  }

  // プログレスバー用のパーセンテージを計算
  const progress = (currentStep / TOTAL_STEPS) * 100;

  // --- メイン画面のレンダリング ---
  return (
    <div className="container max-w-lg mx-auto py-4 px-4 h-[100dvh] flex flex-col overflow-hidden">
      {/* プログレスバー（固定） */}
      <div className="flex-none mb-6 space-y-2 text-foreground">
        <div className="flex justify-between text-sm text-muted-foreground font-medium">
          <span>ステップ {currentStep} / {TOTAL_STEPS}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-muted/50" />
      </div>

      {/* コンテンツ入力領域（スクロール可能） */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-4 px-0.5">
        {/* Step 1: 基本プロフィール */}
        {currentStep === ONBOARDING_STEP.PROFILE && (
          <Card className="animate-slide-up shadow-sm border-2">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle>基本情報</CardTitle>
              </div>
              <CardDescription>
                あなたの名前とダイエット目標を教えてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">ニックネーム</Label>
                <Input
                  id="name"
                  placeholder="例: たろう"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentWeight">現在の体重 (kg)</Label>
                  <Input
                    id="currentWeight"
                    type="number"
                    step="0.1"
                    value={formData.currentWeight}
                    onChange={(e) => setFormData({ ...formData, currentWeight: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetWeight">目標体重 (kg)</Label>
                  <Input
                    id="targetWeight"
                    type="number"
                    step="0.1"
                    value={formData.targetWeight}
                    onChange={(e) => setFormData({ ...formData, targetWeight: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">目標達成期限</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-muted-foreground">
                  目標体重を達成したい日を選択してください
                </p>
              </div>

              <div className="space-y-2">
                <Label>チートデイ頻度</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.cheatDayFrequency === "weekly" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, cheatDayFrequency: "weekly" })}
                  >
                    週1回
                  </Button>
                  <Button
                    type="button"
                    variant={formData.cheatDayFrequency === "biweekly" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, cheatDayFrequency: "biweekly" })}
                  >
                    2週に1回
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 身体情報 */}
        {currentStep === ONBOARDING_STEP.BODY_INFO && (
          <Card className="animate-slide-up shadow-sm border-2">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle>身体情報</CardTitle>
              </div>
              <CardDescription>
                最適な栄養プランを計算するための情報です
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-foreground">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">年齢</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">性別</Label>
                  <select
                    id="gender"
                    className={SELECT_CLASS_NAME}
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as "male" | "female" | "other" })}
                  >
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">身長 (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>活動レベル</Label>
                <select
                  className={SELECT_CLASS_NAME}
                  value={formData.activity_level}
                  onChange={(e) => setFormData({ ...formData, activity_level: e.target.value as "sedentary" | "light" | "moderate" | "active" | "very_active" })}
                >
                  <option value="sedentary">ほぼ運動しない</option>
                  <option value="light">軽い運動 週に1-2回運動</option>
                  <option value="moderate">中度の運動 週に3-5回運動</option>
                  <option value="active">激しい運動やスポーツ 週に6-7回運動</option>
                  <option value="very_active">非常に激しい運動・肉体労働 1日に2回運動</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>目標</Label>
                <select
                  className={SELECT_CLASS_NAME}
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value as "lose" | "maintain" | "gain" })}
                >
                  <option value="lose">痩せたい（減量）</option>
                  <option value="maintain">維持したい</option>
                  <option value="gain">筋肉をつけたい（増量）</option>
                </select>
              </div>

              <NutritionPreferencesForm
                goal={formData.goal}
                formData={formData}
                onFormChange={(updates) => setFormData({ ...formData, ...updates })}
                selectClassName={SELECT_CLASS_NAME}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: 栄養目標確認 */}
        {currentStep === ONBOARDING_STEP.NUTRITION_REVIEW && nutritionResult && (() => {
          // PFCのカロリー計算
          const proteinKcal = nutritionResult.pfc.protein * 4;
          const fatKcal = nutritionResult.pfc.fat * 9;
          const carbsKcal = nutritionResult.pfc.carbs * 4;
          const totalKcal = proteinKcal + fatKcal + carbsKcal;
          const pct = (kcal: number) => totalKcal ? Math.round((kcal / totalKcal) * 100) : 0;

          // ペース情報の計算
          const delta = nutritionResult.dailyCalories - (nutritionResult.tdee || 0);

          // カラーパレット
          const COLORS = {
            primary: "#FF8C00",   // Protein (Orange)
            secondary: "#FFD700", // Fat (Yellow)
            tertiary: "#4CAF50",  // Carbs (Green)
          };
          
          // アクセシビリティ用テキストカラー（背景白に対して十分なコントラストを確保）
          const TEXT_COLORS = {
            primary: "text-orange-700",
            secondary: "text-yellow-700",
            tertiary: "text-green-700",
          };

          // ドーナツチャート計算用
          const radius = 40;
          const circumference = 2 * Math.PI * radius;
          const pPct = pct(proteinKcal);
          const fPct = pct(fatKcal);
          const cPct = pct(carbsKcal);

          // 各セグメントの長さ（stroke-dasharray用）
          const pDash = `${(circumference * pPct) / 100} ${circumference}`;
          const fDash = `${(circumference * fPct) / 100} ${circumference}`;
          const cDash = `${(circumference * cPct) / 100} ${circumference}`;

          const pOffset = 0;
          const fOffset = -((circumference * pPct) / 100);
          const cOffset = -((circumference * (pPct + fPct)) / 100);

          return (
            <Card className="animate-pop-in shadow-sm border-2 overflow-hidden bg-white/50 backdrop-blur-sm">
              <CardContent className="space-y-8 pt-8 pb-6">
                
                {/* 1. Main Goal: 摂取カロリー目標 */}
                <div className="text-center space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                    Daily Target
                  </p>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-5xl font-extrabold tracking-tight" style={{ color: COLORS.primary }}>
                      {nutritionResult.dailyCalories.toLocaleString()}
                    </span>
                    <span className="text-lg font-medium text-muted-foreground">kcal</span>
                  </div>
                  
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 text-xs font-medium mt-2">
                    {formData.goal === "lose" && (
                      <>
                        <span className="mr-1.5">📉</span>
                        減量: {Math.abs(Math.round(delta))}kcal 削減 / 日
                      </>
                    )}
                    {formData.goal === "gain" && (
                      <>
                        <span className="mr-1.5">📈</span>
                        増量: {Math.abs(Math.round(delta))}kcal 上乗せ / 日
                      </>
                    )}
                    {formData.goal === "maintain" && (
                      <>
                        <span className="mr-1.5">⚖️</span>
                        維持: バランス重視
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Visualization: PFC Balance Donut Chart */}
                <div className="bg-white rounded-2xl border shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                    {/* SVG Chart */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                        <circle cx="50" cy="50" r={radius} stroke="#eee" strokeWidth="12" fill="transparent" />
                        <circle
                          cx="50" cy="50" r={radius}
                          stroke={COLORS.primary} strokeWidth="12" fill="transparent"
                          strokeDasharray={pDash}
                          strokeDashoffset={pOffset}
                          strokeLinecap="butt"
                          className="transition-all duration-1000 ease-out"
                        />
                        <circle
                          cx="50" cy="50" r={radius}
                          stroke={COLORS.secondary} strokeWidth="12" fill="transparent"
                          strokeDasharray={fDash}
                          strokeDashoffset={fOffset}
                          strokeLinecap="butt"
                          className="transition-all duration-1000 ease-out"
                        />
                        <circle
                          cx="50" cy="50" r={radius}
                          stroke={COLORS.tertiary} strokeWidth="12" fill="transparent"
                          strokeDasharray={cDash}
                          strokeDashoffset={cOffset}
                          strokeLinecap="butt"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-foreground pointer-events-none">
                        <span className="font-bold">PFC</span>
                        <span className="font-bold">Balance</span>
                      </div>
                    </div>

                    {/* Legend / Details */}
                    <div className="flex-1 w-full space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.primary }} />
                          <span className={`font-bold ${TEXT_COLORS.primary}`}>Protein</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold">{nutritionResult.pfc.protein}g</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct(proteinKcal)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.secondary }} />
                          <span className={`font-bold ${TEXT_COLORS.secondary}`}>Fat</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold">{nutritionResult.pfc.fat}g</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct(fatKcal)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.tertiary }} />
                          <span className={`font-bold ${TEXT_COLORS.tertiary}`}>Carbs</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold">{nutritionResult.pfc.carbs}g</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct(carbsKcal)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Stats Grid: BMR, TDEE, Diff */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/30 rounded-xl border text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">BMR</p>
                    <p className="font-bold text-lg leading-none">{nutritionResult.bmr?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">基礎代謝</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-xl border text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">TDEE</p>
                    <p className="font-bold text-lg leading-none">{nutritionResult.tdee?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">活動代謝</p>
                  </div>
                  <div className={`p-3 rounded-xl border text-center space-y-1 ${
                    delta !== 0 ? "bg-orange-50/50 border-orange-100" : "bg-muted/30"
                  }`}>
                    <p className="text-[10px] text-muted-foreground uppercase">Diff</p>
                    <p className="font-bold text-lg leading-none text-orange-600">
                      {delta > 0 ? "+" : ""}{Math.round(delta)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {delta > 0 ? "上乗せ" : delta < 0 ? "削減" : "維持"}
                    </p>
                  </div>
                </div>

                {/* 4. Advice / Hints */}
                <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-xl space-y-2">
                   <div className="flex gap-2 items-start">
                      <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        {formData.goal === "lose" && "無理のないペース設定です。空腹を感じにくい高タンパク質な食事を心がけましょう。"}
                        {formData.goal === "gain" && "筋肉合成に必要なカロリー余剰を確保しています。トレーニング強度に合わせて調整可能です。"}
                        {formData.goal === "maintain" && "現在の体重を維持するための設定です。日々の活動量に応じて微調整しましょう。"}
                        {nutritionResult.strategySummary && <span className="block mt-1 pt-1 border-t border-muted-foreground/20">{nutritionResult.strategySummary}</span>}
                      </div>
                   </div>
                   
                   <details className="pt-2">
                      <summary className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 font-medium">
                        計算の詳細を見る
                      </summary>
                      {/* TODO: Add calculation details visualization here */}
                      <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                        詳細な計算ロジックは調整中です
                      </div>
                   </details>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Step 4: 現状の食生活確認 */}
        {currentStep === ONBOARDING_STEP.CURRENT_DIET && (
          <Card className="animate-slide-up shadow-sm border-2">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                <CardTitle>いつもの食事</CardTitle>
              </div>
              <CardDescription>
                普段の食事内容を教えてください。急な変化によるストレスを防ぎ、無理のないプランを提案するために使用します。
                <br />
                <span className="text-xs text-muted-foreground">※おおよそで構いません</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-foreground">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diet-breakfast">朝食 <span className="text-destructive font-normal">(必須)</span></Label>
                  <Input
                    id="diet-breakfast"
                    placeholder="例: 何も食べない、コーヒーのみ、トースト1枚"
                    value={formData.currentDiet.breakfast}
                    onChange={(e) => setFormData({
                      ...formData,
                      currentDiet: { ...formData.currentDiet, breakfast: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diet-lunch">昼食 <span className="text-destructive font-normal">(必須)</span></Label>
                  <Input
                    id="diet-lunch"
                    placeholder="例: コンビニのおにぎり2個、社食の定食（ご飯大盛り）"
                    value={formData.currentDiet.lunch}
                    onChange={(e) => setFormData({
                      ...formData,
                      currentDiet: { ...formData.currentDiet, lunch: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diet-dinner">夕食 <span className="text-destructive font-normal">(必須)</span></Label>
                  <Input
                    id="diet-dinner"
                    placeholder="例: パスタ1人前、ビール350mlと唐揚げ"
                    value={formData.currentDiet.dinner}
                    onChange={(e) => setFormData({
                      ...formData,
                      currentDiet: { ...formData.currentDiet, dinner: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diet-snack">間食（あれば）</Label>
                  <Input
                    id="diet-snack"
                    placeholder="例: チョコレート3粒、ナッツ、特になし"
                    value={formData.currentDiet.snack}
                    onChange={(e) => setFormData({
                      ...formData,
                      currentDiet: { ...formData.currentDiet, snack: e.target.value }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: 好み設定 */}
        {currentStep === ONBOARDING_STEP.PREFERENCES && (
          <Card className="animate-slide-up shadow-sm border-2">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                <CardTitle>食の好み</CardTitle>
              </div>
              <CardDescription>
                よりパーソナライズされた提案のために教えてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-foreground">
              <div className="space-y-2">
                <Label>アレルギー・苦手な食材</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="例: えび"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                  />
                  <Button type="button" variant="outline" onClick={addAllergy}>
                    追加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.allergies.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          allergies: formData.allergies.filter((a) => a !== item),
                        })
                      }
                    >
                      {item} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>好きな食材</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="例: 鶏肉"
                    value={favoriteInput}
                    onChange={(e) => setFavoriteInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFavorite())}
                  />
                  <Button type="button" variant="outline" onClick={addFavorite}>
                    追加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.favoriteIngredients.map((item) => (
                    <Badge
                      key={item}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          favoriteIngredients: formData.favoriteIngredients.filter((f) => f !== item),
                        })
                      }
                    >
                      {item} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>好きなジャンル（複数選択可）</Label>
                <div className="flex flex-wrap gap-2">
                  {(["和食", "洋食", "中華", "イタリアン", "エスニック", "その他"] as const).map((cuisine) => {
                    const isSelected = formData.preferredCuisines.includes(cuisine);
                    return (
                      <Badge
                        key={cuisine}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              preferredCuisines: formData.preferredCuisines.filter((c) => c !== cuisine),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              preferredCuisines: [...formData.preferredCuisines, cuisine],
                            });
                          }
                        }}
                      >
                        {cuisine}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <Label>味付けの好み</Label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground px-1">
                    <span>さっぱり</span>
                    <span>こってり</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.flavorProfile === "light" ? "default" : "outline"}
                      className="flex-1 text-xs px-1"
                      onClick={() => setFormData({ ...formData, flavorProfile: "light" })}
                    >
                      さっぱり
                    </Button>
                    <Button
                      type="button"
                      variant={formData.flavorProfile === "medium" ? "default" : "outline"}
                      className="flex-1 text-xs px-1"
                      onClick={() => setFormData({ ...formData, flavorProfile: "medium" })}
                    >
                      普通
                    </Button>
                    <Button
                      type="button"
                      variant={formData.flavorProfile === "rich" ? "default" : "outline"}
                      className="flex-1 text-xs px-1"
                      onClick={() => setFormData({ ...formData, flavorProfile: "rich" })}
                    >
                      こってり
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>料理スキル</Label>
                <select
                  className={SELECT_CLASS_NAME}
                  value={formData.cookingSkillLevel}
                  onChange={(e) => setFormData({ ...formData, cookingSkillLevel: e.target.value as "beginner" | "intermediate" | "advanced" })}
                >
                  <option value="beginner">初心者（簡単なものが良い）</option>
                  <option value="intermediate">普通（基本的な調理OK）</option>
                  <option value="advanced">上級者（手の込んだ料理もOK）</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>調理時間の目安</Label>
                <select
                  className={SELECT_CLASS_NAME}
                  value={formData.availableTime}
                  onChange={(e) => setFormData({ ...formData, availableTime: e.target.value as "short" | "medium" | "long" })}
                >
                  <option value="short">短め（15分以内）</option>
                  <option value="medium">普通（30分程度）</option>
                  <option value="long">長めでもOK（1時間以上）</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: 食事のこだわり */}
        {currentStep === ONBOARDING_STEP.MEAL_SETTINGS && (
          <Card className="animate-slide-up shadow-sm border-2">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle>食事のこだわり</CardTitle>
              </div>
              <CardDescription>
                各食事のスロットに対して、固定メニューやこだわり条件を設定できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 text-foreground pb-8">
              {(["breakfast", "lunch", "dinner"] as const).map((mealKey) => {
                const mealLabel = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" }[mealKey];
                const icon = {
                  breakfast: <Clock className="w-4 h-4 text-orange-500" />,
                  lunch: <Activity className="w-4 h-4 text-blue-500" />,
                  dinner: <UtensilsCrossed className="w-4 h-4 text-purple-500" />,
                }[mealKey];
                
                const setting = formData.mealSettings[mealKey];

                return (
                  <div key={mealKey} className="space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {icon}
                      <span>{mealLabel}</span>
                    </div>

                    <div className="flex p-1 bg-muted rounded-lg border">
                      {(["auto", "fixed", "custom"] as const).map((mode) => (
                        <Button
                          key={mode}
                          type="button"
                          variant={setting.mode === mode ? "default" : "ghost"}
                          size="sm"
                          className="flex-1 text-xs h-8 rounded-md"
                          onClick={() => setFormData({
                            ...formData,
                            mealSettings: {
                              ...formData.mealSettings,
                              [mealKey]: { ...setting, mode }
                            }
                          })}
                        >
                          {{ auto: "おまかせ", fixed: "固定", custom: "こだわり" }[mode]}
                        </Button>
                      ))}
                    </div>

                    {setting.mode !== "auto" && (
                      <div className="space-y-3 animate-slide-down">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                          {setting.mode === "fixed" ? "メニュー（要望併記可）" : "こだわり要望（自由入力）"}
                        </Label>
                        <textarea
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-sm bg-background min-h-[80px]"
                          placeholder={
                            setting.mode === "fixed" 
                              ? "例: 納豆ご飯、味噌汁。ご飯の量は100g以下" 
                              : "例: コンビニで買う、800kcal以下にする"
                          }
                          value={setting.text}
                          onChange={(e) => setFormData({
                            ...formData,
                            mealSettings: {
                              ...formData.mealSettings,
                              [mealKey]: { ...setting, text: e.target.value }
                            }
                          })}
                        />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {setting.mode === "fixed" 
                            ? "💡 指定されたメニューをベースに、要望を考慮して1日の栄養を調整します" 
                            : "💡 要望に合わせた献立をAIが提案し、他の食事で栄養を補完します"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Step 6: プラン作成 */}
        {currentStep === ONBOARDING_STEP.PLAN_CREATION && (
          <Card className="animate-pop-in h-96 flex flex-col justify-center border-2 border-primary/20 bg-primary/5">
            <CardContent className="text-center py-12 space-y-6 text-foreground">
              <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">準備完了！</h2>
                <p className="text-muted-foreground">
                  さっそく{DEFAULT_DURATION}日間の食事プランを作成しましょう
                </p>
              </div>
              <div className="p-4 bg-white/50 rounded-xl border-dashed border-2">
                <p className="text-sm text-muted-foreground">
                  プラン作成には1〜2分かかります。
                  <br />
                  作成中にページを閉じても問題ありません。
                </p>
              </div>
              <Button
                size="lg"
                className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
                onClick={handleCreatePlan}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    開始中...
                  </>
                ) : (
                  <>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    プランを作成する
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ナビゲーションボタン（固定） */}
      {currentStep < ONBOARDING_STEP.PLAN_CREATION && (
        <div className="flex-none pt-4 pb-2 border-t bg-background/80 backdrop-blur-sm flex gap-4 mt-auto">
          {currentStep > ONBOARDING_STEP.PROFILE && (
            <Button
              variant="outline"
              className="flex-1 rounded-full border-2 font-bold"
              onClick={handleBack}
              disabled={submitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          )}
          <Button
            className="flex-1 rounded-full font-bold shadow-md hover:shadow-lg transition-all"
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentStep === ONBOARDING_STEP.BODY_INFO ? (
              <>
                <Zap className="w-4 h-4 mr-1" />
                計算開始
              </>
            ) : (
              <>
                次へ
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
