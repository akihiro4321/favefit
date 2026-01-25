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
  Settings,
  CalendarDays,
} from "lucide-react";
import { updateUserProfile, completeOnboarding } from "@/lib/db/firestore/userRepository";
import type { LearnedPreferences, UserDocument, UserProfile } from "@/lib/schema";
import { db } from "@/lib/db/firestore/client";
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { PlanCreatingScreen } from "@/components/plan-creating-screen";
import { NutritionPreferencesForm } from "@/components/nutrition-preferences-form";
import type { CalculateNutritionRequest } from "@/lib/schemas/user";

// オンボーディングの総ステップ数
const TOTAL_STEPS = 5;

// 各ステップを識別するための定数オブジェクト
const ONBOARDING_STEP = {
  PROFILE: 1,        // 基本プロフィール（名前、体重目標など）
  BODY_INFO: 2,      // 身体情報（年齢、身長、活動レベルなど）
  NUTRITION_REVIEW: 3, // AI計算による栄養目標の確認
  PREFERENCES: 4,    // 食の好み設定（アレルギー、好きな食材など）
  PLAN_CREATION: 5,  // プラン作成開始
} as const;

// セレクトボックス共通のTailwindクラス
const SELECT_CLASS_NAME = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/**
 * オンボーディングで収集するフォームデータの型定義
 * 各ステップで入力される情報をまとめて管理
 */
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

  // Step 4: 食の好み
  allergies: string[];            // アレルギー・苦手な食材
  favoriteIngredients: string[];  // 好きな食材
  preferredCuisines: string[];    // 好きな料理ジャンル
  flavorProfile: "light" | "medium" | "rich"; // 味付けの好み（さっぱり〜こってり）
  cookingSkillLevel: "beginner" | "intermediate" | "advanced"; // 料理スキル
  availableTime: "short" | "medium" | "long"; // 調理時間の目安
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
  allergies: [],
  favoriteIngredients: [],
  preferredCuisines: [],
  flavorProfile: "medium",
  cookingSkillLevel: "intermediate",
  availableTime: "medium",
};

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * FirestoreのTimestampをinput[type="date"]用の文字列に変換
 */
const getDeadlineInput = (deadline?: { toDate: () => Date } | null) => {
  if (!deadline) return "";
  return deadline.toDate().toISOString().split("T")[0];
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
  const base: Partial<UserProfile> = profile.profile;
  return {
    displayName: base.displayName || DEFAULT_FORM_DATA.displayName,
    currentWeight: base.currentWeight || DEFAULT_FORM_DATA.currentWeight,
    targetWeight: base.targetWeight || DEFAULT_FORM_DATA.targetWeight,
    deadline: getDeadlineInput(base.deadline ?? null),
    cheatDayFrequency: base.cheatDayFrequency || DEFAULT_FORM_DATA.cheatDayFrequency,
    age: base.age || DEFAULT_FORM_DATA.age,
    gender: base.gender || DEFAULT_FORM_DATA.gender,
    height_cm: base.height_cm || DEFAULT_FORM_DATA.height_cm,
    activity_level:
      base.activity_level || DEFAULT_FORM_DATA.activity_level,
    goal: base.goal || DEFAULT_FORM_DATA.goal,
    lossPaceKgPerMonth: profile.nutrition?.preferences?.lossPaceKgPerMonth ?? DEFAULT_FORM_DATA.lossPaceKgPerMonth,
    maintenanceAdjustKcalPerDay:
      profile.nutrition?.preferences?.maintenanceAdjustKcalPerDay ?? DEFAULT_FORM_DATA.maintenanceAdjustKcalPerDay,
    gainPaceKgPerMonth: profile.nutrition?.preferences?.gainPaceKgPerMonth ?? DEFAULT_FORM_DATA.gainPaceKgPerMonth,
    gainStrategy: profile.nutrition?.preferences?.gainStrategy || DEFAULT_FORM_DATA.gainStrategy,
    macroPreset: profile.nutrition?.preferences?.macroPreset || DEFAULT_FORM_DATA.macroPreset,
    allergies: base.allergies || DEFAULT_FORM_DATA.allergies,
    favoriteIngredients: base.favoriteIngredients || DEFAULT_FORM_DATA.favoriteIngredients,
    preferredCuisines: getPreferredCuisines(profile.learnedPreferences),
    flavorProfile: getFlavorProfile(profile.learnedPreferences),
    cookingSkillLevel: base.cookingSkillLevel || DEFAULT_FORM_DATA.cookingSkillLevel,
    availableTime: base.availableTime || DEFAULT_FORM_DATA.availableTime,
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
  // AI計算による栄養目標の結果を保持
  const [nutritionResult, setNutritionResult] = useState<{
    dailyCalories: number;
    pfc: { protein: number; fat: number; carbs: number };
    strategySummary?: string;
  } | null>(null);

  // プロフィールが設定済みかどうか
  const isProfileConfigured = profile?.profile?.age && profile?.profile?.height_cm && profile?.nutrition?.dailyCalories;
  
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
   * 入力された身体情報をもとにAIで栄養目標を計算
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

    setNutritionResult(result.nutrition);
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

    await updateUserProfile(user!.uid, {
      displayName: formData.displayName || "ユーザー",
      currentWeight: formData.currentWeight,
      targetWeight: formData.targetWeight,
      deadline: deadlineTimestamp,
      cheatDayFrequency: formData.cheatDayFrequency,
      age: formData.age,
      gender: formData.gender,
      height_cm: formData.height_cm,
      activity_level: formData.activity_level,
      goal: formData.goal,
      allergies: formData.allergies,
      favoriteIngredients: formData.favoriteIngredients,
      cookingSkillLevel: formData.cookingSkillLevel,
      availableTime: formData.availableTime,
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

      const userRef = doc(db, "users", user!.uid);
      await updateDoc(userRef, {
        "learnedPreferences.cuisines": initialCuisines,
        "learnedPreferences.flavorProfile": initialFlavorProfile,
        updatedAt: serverTimestamp(),
      });
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

    if (currentStep === ONBOARDING_STEP.PREFERENCES) {
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
      await completeOnboarding(user!.uid);

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

  /** プロフィール設定済みユーザーが設定をスキップしてプラン作成へ進む */
  const handleSkipToCreatePlan = () => {
    setCurrentStep(ONBOARDING_STEP.PLAN_CREATION);
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
      />
    );
  }

  // プログレスバー用のパーセンテージを計算
  const progress = (currentStep / TOTAL_STEPS) * 100;

  // --- メイン画面のレンダリング ---
  return (
    <div className="container max-w-lg mx-auto py-8 px-4 min-h-screen flex flex-col">
      {/* プログレスバー */}
      <div className="mb-8 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>ステップ {currentStep} / {TOTAL_STEPS}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step 1: 基本プロフィール */}
      {currentStep === ONBOARDING_STEP.PROFILE && (
        <Card className="animate-slide-up flex-1">
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
            {/* プロフィール設定済みの場合のスキップオプション */}
            {isProfileConfigured && (
              <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  プロフィールは設定済みです
                </div>
                <div className="text-sm space-y-1">
                  <p>現在: {profile?.profile?.currentWeight}kg → 目標: {profile?.profile?.targetWeight}kg</p>
                  <p>カロリー目標: {profile?.nutrition?.dailyCalories} kcal</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleSkipToCreatePlan}
                  >
                    <CalendarDays className="w-4 h-4 mr-1" />
                    プラン作成へ進む
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCurrentStep(ONBOARDING_STEP.PROFILE)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    設定を見直す
                  </Button>
                </div>
              </div>
            )}

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
        <Card className="animate-slide-up flex-1">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>身体情報</CardTitle>
            </div>
            <CardDescription>
              AIが最適な栄養プランを計算するための情報です
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
      {currentStep === ONBOARDING_STEP.NUTRITION_REVIEW && nutritionResult && (
        <Card className="animate-pop-in flex-1">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle>あなたの栄養目標</CardTitle>
            </div>
            <CardDescription>
              入力内容に基づいて栄養目標を算出しました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
              <p className="text-sm text-muted-foreground mb-1">1日の目標カロリー</p>
              <p className="text-4xl font-bold text-primary">
                {nutritionResult.dailyCalories.toLocaleString()}
                <span className="text-lg font-normal text-muted-foreground ml-1">kcal</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">タンパク質</p>
                <p className="text-xl font-bold">{nutritionResult.pfc.protein}g</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">脂質</p>
                <p className="text-xl font-bold">{nutritionResult.pfc.fat}g</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">炭水化物</p>
                <p className="text-xl font-bold">{nutritionResult.pfc.carbs}g</p>
              </div>
            </div>

            {nutritionResult.strategySummary && (
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                  {nutritionResult.strategySummary}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: 好み設定 */}
      {currentStep === ONBOARDING_STEP.PREFERENCES && (
        <Card className="animate-slide-up flex-1">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              <CardTitle>食の好み</CardTitle>
            </div>
            <CardDescription>
              よりパーソナライズされた提案のために教えてください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {/* 料理ジャンルの複数選択（タップでトグル） */}
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

            {/* 味付けの好み（3段階で選択） */}
            <div className="space-y-4">
              <Label>味付けの好み</Label>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>さっぱり</span>
                  <span>こってり</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.flavorProfile === "light" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, flavorProfile: "light" })}
                  >
                    さっぱり
                  </Button>
                  <Button
                    type="button"
                    variant={formData.flavorProfile === "medium" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, flavorProfile: "medium" })}
                  >
                    普通
                  </Button>
                  <Button
                    type="button"
                    variant={formData.flavorProfile === "rich" ? "default" : "outline"}
                    className="flex-1"
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

      {/* Step 5: プラン作成 */}
      {currentStep === ONBOARDING_STEP.PLAN_CREATION && (
        <Card className="animate-pop-in flex-1 flex flex-col justify-center">
          <CardContent className="text-center py-12 space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">準備完了！</h2>
              <p className="text-muted-foreground">
                さっそく14日間の食事プランを作成しましょう
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-sm text-muted-foreground">
                プラン作成には1〜2分かかります。
                <br />
                作成中にページを閉じても問題ありません。
              </p>
            </div>
            <Button
              size="lg"
              className="rounded-full px-8"
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

      {/* ナビゲーションボタン */}
      {currentStep < ONBOARDING_STEP.PLAN_CREATION && (
        <div className="flex gap-4 mt-8">
          {currentStep > ONBOARDING_STEP.PROFILE && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleBack}
              disabled={submitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentStep === ONBOARDING_STEP.BODY_INFO ? (
              <>
                <Zap className="w-4 h-4 mr-1" />
                AIで計算
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
