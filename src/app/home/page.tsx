"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Utensils,
  Flame,
  ChevronRight,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { DayPlan, PlanDocument } from "@/lib/schema";
import Link from "next/link";
import { PlanCreatingScreen } from "@/components/plan-creating-screen";

export default function HomePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [todaysMeals, setTodaysMeals] = useState<DayPlan | null>(null);
  const [activePlan, setActivePlan] = useState<
    (PlanDocument & { id: string }) | null
  >(null);
  const [pendingPlan, setPendingPlan] = useState<
    (PlanDocument & { id: string }) | null
  >(null);
  const [fetching, setFetching] = useState(true);

  // プラン作成中かどうか
  const isPlanCreating = profile?.planCreationStatus === "creating";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [activeRes, pendingRes] = await Promise.all([
          fetch('/api/plan/get-active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          }),
          fetch('/api/plan/get-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          }),
        ]);

        const activeData = await activeRes.json();
        const pendingData = await pendingRes.json();

        const active = activeData.data?.plan || null;
        const pending = pendingData.data?.plan || null;

        setActivePlan(active);
        setPendingPlan(pending);

        // Activeプランがある場合は今日のメニューを設定
        if (active) {
          const today = new Date().toISOString().split("T")[0];
          setTodaysMeals(active.days[today] || null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setFetching(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  // プラン作成中の場合は定期的にステータスをチェック
  useEffect(() => {
    if (isPlanCreating && user) {
      const interval = setInterval(async () => {
        await refreshProfile();
        // プランも再取得
        const [activeRes, pendingRes] = await Promise.all([
          fetch('/api/plan/get-active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          }),
          fetch('/api/plan/get-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          }),
        ]);

        const activeData = await activeRes.json();
        const pendingData = await pendingRes.json();

        const active = activeData.data?.plan || null;
        const pending = pendingData.data?.plan || null;

        setActivePlan(active);
        setPendingPlan(pending);
        if (active) {
          const today = new Date().toISOString().split("T")[0];
          setTodaysMeals(active.days[today] || null);
        }
      }, 5000); // 5秒ごとにチェック
      return () => clearInterval(interval);
    }
  }, [isPlanCreating, user, refreshProfile]);

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (!user) return null;

  if (isPlanCreating) {
    return <PlanCreatingScreen />;
  }

  // プランがない場合（activeもpendingもない）
  if (!activePlan && !pendingPlan) {
    // オンボーディング完了済みならプラン作成ページへ、未完了ならオンボーディングへ
    const targetPath = profile?.onboardingCompleted ? "/plan" : "/onboarding";
    const buttonText = profile?.onboardingCompleted ? "プランを作成する" : "オンボーディングを開始する";

    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-4 animate-pop-in">
          <Sparkles className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold text-primary">FaveFit</h1>
          <p className="text-muted-foreground">
            1週間の食事プランを作成して、
            <br />
            ダイエットを楽しく始めましょう！
          </p>
          <Button
            size="lg"
            className="rounded-full px-8 mt-4"
            onClick={() => router.push(targetPath)}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    );
  }

  // Pending状態のプランがある場合は、プラン画面に誘導
  if (!activePlan && pendingPlan) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-4 animate-pop-in">
          <Sparkles className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold text-primary">プランが承認待ちです</h1>
          <p className="text-muted-foreground">
            プランが作成されました。
            <br />
            プラン画面で確認して承認してください。
          </p>
          <Button
            size="lg"
            className="rounded-full px-8 mt-4"
            onClick={() => router.push("/plan")}
          >
            プランを確認する
          </Button>
        </div>
      </div>
    );
  }

  // チートデイの場合
  if (todaysMeals?.isCheatDay) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
        <Card className="bg-gradient-to-br from-secondary/30 to-primary/20 border-secondary animate-pop-in">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <PartyPopper className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">🎉 CHEAT DAY!</h1>
            <p className="text-muted-foreground">
              今日は好きなものを楽しむ日。
              <br />
              罪悪感なく、心も体もリフレッシュ！
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 通常のホーム画面
  const mealEntries = todaysMeals?.meals ? Object.entries(todaysMeals.meals) : [];
  const completedMeals = mealEntries.filter(
    ([, m]) => m.status === "completed"
  ).length;
  const totalMeals = mealEntries.length;
  const progressPercent = totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="space-y-2 animate-slide-up">
        <h1 className="text-2xl font-bold">今日のメニュー</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flame className="w-4 h-4 text-primary" />
          <span>
            目標: {profile?.nutrition?.dailyCalories || 0} kcal / 残り:{" "}
            {Math.max(0, (profile?.nutrition?.dailyCalories || 0) -
              (todaysMeals?.totalNutrition?.calories || 0)).toFixed(1)}{" "}
            kcal
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {completedMeals}/{totalMeals} 食完了
        </p>
      </div>

      {/* 食事カード */}
      <div className="space-y-4">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((mealType) => {
          const meal = todaysMeals?.meals?.[mealType];
          if (!meal) return null;

          const isCompleted = meal.status === "completed";
          const mealLabels = {
            breakfast: "🍳 朝食",
            lunch: "🍱 昼食",
            dinner: "🍽️ 夕食",
            snack: "🍪 間食・調整食",
          };

          return (
            <Link key={mealType} href={`/recipe/${meal.recipeId}`}>
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                  isCompleted ? "opacity-60" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {mealLabels[mealType]}
                    </span>
                    {isCompleted && (
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        完了
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Utensils className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{meal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(meal.nutrition.calories).toFixed(1)} kcal
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* クイックアクション */}
      <div className="flex gap-4 pt-4">
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={() => router.push("/fridge")}
        >
          🥗 別のメニューを提案
        </Button>
      </div>
    </div>
  );
}