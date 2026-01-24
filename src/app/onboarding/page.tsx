"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
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
  Clock,
} from "lucide-react";
import { updateUserProfile, completeOnboarding } from "@/lib/user";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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
  const [formData, setFormData] = useState({
    // Step 1: 基本プロフィール
    displayName: "",
    currentWeight: 65,
    targetWeight: 60,
    cheatDayFrequency: "weekly" as "weekly" | "biweekly",
    // Step 2: 身体情報
    age: 30,
    gender: "male" as "male" | "female" | "other",
    height_cm: 170,
    activity_level: "moderate" as "low" | "moderate" | "high",
    goal: "lose" as "lose" | "maintain" | "gain",
    // Step 4: 好み
    allergies: [] as string[],
    favoriteIngredients: [] as string[],
    preferredCuisines: [] as string[],
    flavorProfile: "medium" as "light" | "medium" | "rich",
    cookingSkillLevel: "intermediate" as "beginner" | "intermediate" | "advanced",
    availableTime: "medium" as "short" | "medium" | "long",
  });

  const [allergyInput, setAllergyInput] = useState("");
  const [favoriteInput, setFavoriteInput] = useState("");

  // プロフィールから初期値を設定
  useEffect(() => {
    if (profile?.profile) {
      setFormData((prev) => ({
        ...prev,
        displayName: profile.profile.displayName || "",
        currentWeight: profile.profile.currentWeight || 65,
        targetWeight: profile.profile.targetWeight || 60,
        cheatDayFrequency: profile.profile.cheatDayFrequency || "weekly",
        age: profile.profile.age || 30,
        gender: profile.profile.gender || "male",
        height_cm: profile.profile.height_cm || 170,
        activity_level: profile.profile.activity_level || "moderate",
        goal: profile.profile.goal || "lose",
        allergies: profile.profile.allergies || [],
        favoriteIngredients: profile.profile.favoriteIngredients || [],
        preferredCuisines: Object.keys(profile.learnedPreferences?.cuisines || {}).map((c) => {
          // 小文字を大文字に変換（和食、洋食など）
          return c.charAt(0).toUpperCase() + c.slice(1);
        }),
        flavorProfile: Object.keys(profile.learnedPreferences?.flavorProfile || {}).includes("light")
          ? "light"
          : Object.keys(profile.learnedPreferences?.flavorProfile || {}).includes("rich")
          ? "rich"
          : "medium",
        cookingSkillLevel: profile.profile.cookingSkillLevel || "intermediate",
        availableTime: profile.profile.availableTime || "medium",
      }));

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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // プラン作成中の場合は定期的にステータスをチェック
  useEffect(() => {
    if (isPlanCreating) {
      const interval = setInterval(() => {
        refreshProfile();
      }, 5000); // 5秒ごとにチェック
      return () => clearInterval(interval);
    }
  }, [isPlanCreating, refreshProfile]);

  const handleNext = async () => {
    if (currentStep === 2) {
      // Step 2 完了時: AI で栄養計算
      setSubmitting(true);
      try {
        const response = await fetch("/api/calculate-nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.uid,
            profile: {
              age: formData.age,
              gender: formData.gender,
              height_cm: formData.height_cm,
              weight_kg: formData.currentWeight,
              activity_level: formData.activity_level,
              goal: formData.goal,
            },
          }),
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        setNutritionResult(result.nutrition);
        setCurrentStep(3);
      } catch (error) {
        console.error("Nutrition calculation failed:", error);
        alert("栄養目標の計算に失敗しました。");
      } finally {
        setSubmitting(false);
      }
    } else if (currentStep === 4) {
      // Step 4 完了時: プロフィール保存
      setSubmitting(true);
      try {
        await updateUserProfile(user!.uid, {
          displayName: formData.displayName || "ユーザー",
          currentWeight: formData.currentWeight,
          targetWeight: formData.targetWeight,
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

        // 初期嗜好プロファイルを設定
        if (formData.preferredCuisines.length > 0 || formData.flavorProfile) {
          const initialCuisines: Record<string, number> = {};
          formData.preferredCuisines.forEach((cuisine) => {
            initialCuisines[cuisine.toLowerCase()] = 10; // 初期スコア
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

          // learnedPreferencesを更新
          const userRef = doc(db, "users", user!.uid);
          await updateDoc(userRef, {
            "learnedPreferences.cuisines": initialCuisines,
            "learnedPreferences.flavorProfile": initialFlavorProfile,
            updatedAt: serverTimestamp(),
          });
        }
        setCurrentStep(5);
      } catch (error) {
        console.error("Profile save failed:", error);
        alert("プロフィールの保存に失敗しました。");
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // プラン作成を開始
  const handleCreatePlan = async () => {
    setSubmitting(true);
    try {
      // 1. オンボーディング完了をマーク
      await completeOnboarding(user!.uid);

      // 2. プラン生成をリクエスト（バックグラウンドで実行される）
      const response = await fetch("/api/generate-plan", {
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

  // 設定をスキップして直接プラン作成へ
  const handleSkipToCreatePlan = () => {
    setCurrentStep(5);
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !formData.allergies.includes(allergyInput.trim())) {
      setFormData({
        ...formData,
        allergies: [...formData.allergies, allergyInput.trim()],
      });
      setAllergyInput("");
    }
  };

  const addFavorite = () => {
    if (favoriteInput.trim() && !formData.favoriteIngredients.includes(favoriteInput.trim())) {
      setFormData({
        ...formData,
        favoriteIngredients: [...formData.favoriteIngredients, favoriteInput.trim()],
      });
      setFavoriteInput("");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // プラン作成中画面
  if (isPlanCreating) {
    return (
      <div className="container max-w-lg mx-auto py-8 px-4 min-h-screen flex flex-col justify-center">
        <Card className="animate-pop-in">
          <CardContent className="text-center py-12 space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">プラン作成中...</h2>
              <p className="text-muted-foreground">
                AIが14日間の食事プランを生成しています。
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl space-y-3">
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>1〜2分程度かかります</span>
              </div>
              <p className="text-sm text-muted-foreground">
                このページを閉じても問題ありません。
                <br />
                作成が完了したら、再度アクセスしてください。
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/home")}
            >
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

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
      {currentStep === 1 && (
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
                    onClick={() => setCurrentStep(1)}
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
      {currentStep === 2 && (
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value as "low" | "moderate" | "high" })}
              >
                <option value="low">ほとんど動かない</option>
                <option value="moderate">週2-3回の運動</option>
                <option value="high">激しい運動 / 毎日</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>目標</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value as "lose" | "maintain" | "gain" })}
              >
                <option value="lose">痩せたい（減量）</option>
                <option value="maintain">維持したい</option>
                <option value="gain">筋肉をつけたい（増量）</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 栄養目標確認 */}
      {currentStep === 3 && nutritionResult && (
        <Card className="animate-pop-in flex-1">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle>あなたの栄養目標</CardTitle>
            </div>
            <CardDescription>
              AIがあなたに最適なプランを算出しました
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
      {currentStep === 4 && (
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
      {currentStep === 5 && (
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
      {currentStep < 5 && (
        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
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
            ) : currentStep === 2 ? (
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
