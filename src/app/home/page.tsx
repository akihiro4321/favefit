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
import { getActivePlan } from "@/lib/plan";
import { DayPlan, PlanDocument } from "@/lib/schema";
import Link from "next/link";

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [todaysMeals, setTodaysMeals] = useState<DayPlan | null>(null);
  const [activePlan, setActivePlan] = useState<
    (PlanDocument & { id: string }) | null
  >(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const plan = await getActivePlan(user.uid);
        setActivePlan(plan);
        if (plan) {
          const today = new Date().toISOString().split("T")[0];
          setTodaysMeals(plan.days[today] || null);
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

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (!user) return null;

  // プランがない場合
  if (!activePlan) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-4 animate-pop-in">
          <Sparkles className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold text-primary">FaveFit</h1>
          <p className="text-muted-foreground">
            2週間の食事プランを作成して、
            <br />
            ダイエットを楽しく始めましょう！
          </p>
          <Button
            size="lg"
            className="rounded-full px-8 mt-4"
            onClick={() => router.push("/onboarding")}
          >
            プランを作成する
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
  const completedMeals = Object.values(todaysMeals?.meals || {}).filter(
    (m) => m.status === "completed"
  ).length;
  const totalMeals = 3;
  const progressPercent = (completedMeals / totalMeals) * 100;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="space-y-2 animate-slide-up">
        <h1 className="text-2xl font-bold">今日のメニュー</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flame className="w-4 h-4 text-primary" />
          <span>
            目標: {profile?.nutrition?.dailyCalories || 0} kcal / 残り:{" "}
            {(profile?.nutrition?.dailyCalories || 0) -
              (todaysMeals?.totalNutrition?.calories || 0)}{" "}
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
        {(["breakfast", "lunch", "dinner"] as const).map((mealType) => {
          const meal = todaysMeals?.meals?.[mealType];
          if (!meal) return null;

          const isCompleted = meal.status === "completed";
          const mealLabels = {
            breakfast: "🍳 朝食",
            lunch: "🍱 昼食",
            dinner: "🍽️ 夕食",
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
                        {meal.nutrition.calories} kcal
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