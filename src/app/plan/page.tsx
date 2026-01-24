"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CalendarDays,
  PartyPopper,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getActivePlan } from "@/lib/plan";
import { PlanDocument, DayPlan } from "@/lib/schema";
import { BoredomRefreshDialog } from "@/components/boredom-refresh-dialog";
import Link from "next/link";

export default function PlanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activePlan, setActivePlan] = useState<
    (PlanDocument & { id: string }) | null
  >(null);
  const [fetching, setFetching] = useState(true);
  const [showBoredomDialog, setShowBoredomDialog] = useState(false);

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
      } catch (error) {
        console.error("Error fetching plan:", error);
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

  const handleGeneratePlan = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "プラン生成に失敗しました");
      }

      // プランを再取得
      const plan = await getActivePlan(user.uid);
      setActivePlan(plan);
    } catch (error) {
      console.error("Generate plan error:", error);
      alert(error instanceof Error ? error.message : "プラン生成に失敗しました");
    } finally {
      setFetching(false);
    }
  };

  const handleRefreshPlan = async () => {
    if (!activePlan) return;
    
    // 確認ダイアログ
    const confirmed = confirm(
      "14日間のプランを一括で再生成しますか？\n" +
      "現在のプランは上書きされます。"
    );
    
    if (!confirmed) return;

    setFetching(true);
    try {
      // 全14日分の日付を指定して一括再生成
      const allDates = Object.keys(activePlan.days).sort();
      
      const res = await fetch("/api/plan/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user.uid,
          forceDates: allDates, // 全日付を強制指定
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "一括再生成に失敗しました");
      }

      if (result.refreshed) {
        // プランを再取得
        const plan = await getActivePlan(user.uid);
        setActivePlan(plan);
        alert(`14日間のプランを一括再生成しました！\n${result.message}`);
      } else {
        alert(result.message || "再生成は完了しました");
      }
    } catch (error) {
      console.error("Refresh plan error:", error);
      alert(error instanceof Error ? error.message : "一括再生成に失敗しました");
    } finally {
      setFetching(false);
    }
  };

  if (!activePlan) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-4 animate-pop-in">
          <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">プランがありません</h1>
          <p className="text-muted-foreground">
            まずは2週間のプランを作成しましょう
          </p>
          <Button
            size="lg"
            className="rounded-full px-8 mt-4"
            onClick={handleGeneratePlan}
            disabled={fetching}
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                AIがプランを作成中...
              </>
            ) : (
              "プランを作成する"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // 日付でソート
  const sortedDays = Object.entries(activePlan.days).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold">2週間プラン</h1>
          <p className="text-sm text-muted-foreground">
            {activePlan.startDate} 〜
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            onClick={() => setShowBoredomDialog(true)}
            disabled={fetching}
          >
            <Sparkles className="w-4 h-4" />
            飽きた
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            onClick={handleRefreshPlan}
            disabled={fetching}
            title="14日間のプランを一括で再生成します"
          >
            <RefreshCw className="w-4 h-4" />
            一括再生成
          </Button>
        </div>
      </div>

      {/* 飽き防止ダイアログ */}
      {showBoredomDialog && user && (
        <BoredomRefreshDialog
          userId={user.uid}
          onComplete={() => {
            setShowBoredomDialog(false);
            // プランを再取得
            getActivePlan(user.uid).then((plan) => {
              setActivePlan(plan);
            });
          }}
          onClose={() => setShowBoredomDialog(false)}
        />
      )}

      {/* 日別カード */}
      <div className="space-y-3">
        {sortedDays.map(([date, dayPlan], index) => {
          const isToday = date === today;
          const isPast = date < today;
          const dayNumber = index + 1;

          return (
            <DayCard
              key={date}
              date={date}
              dayNumber={dayNumber}
              dayPlan={dayPlan}
              isToday={isToday}
              isPast={isPast}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DayCardProps {
  date: string;
  dayNumber: number;
  dayPlan: DayPlan;
  isToday: boolean;
  isPast: boolean;
}

function DayCard({ date, dayNumber, dayPlan, isToday, isPast }: DayCardProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
  };

  return (
    <Card
      className={`transition-all ${
        isToday
          ? "border-primary shadow-md"
          : isPast
          ? "opacity-60"
          : "hover:shadow-md"
      }`}
    >
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Day {dayNumber}
            </span>
            <span className="font-medium">{formatDate(date)}</span>
            {isToday && (
              <Badge variant="default" className="text-xs">
                今日
              </Badge>
            )}
            {dayPlan.isCheatDay && (
              <Badge
                variant="secondary"
                className="text-xs gap-1 bg-secondary/80"
              >
                <PartyPopper className="w-3 h-3" />
                CHEAT DAY
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {dayPlan.totalNutrition?.calories || 0} kcal
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="flex flex-wrap gap-2 text-sm">
          {(["breakfast", "lunch", "dinner"] as const).map((type) => {
            const meal = dayPlan.meals[type];
            const labels = { breakfast: "朝", lunch: "昼", dinner: "夜" };
            return (
              <Link
                key={type}
                href={`/recipe/${meal.recipeId}`}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <span className="text-xs text-muted-foreground">
                  {labels[type]}
                </span>
                <span className="truncate max-w-[100px]">{meal.title}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
