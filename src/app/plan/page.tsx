"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CalendarDays,
  Sparkles,
  ChevronRight,
  Clock,
  RotateCw,
  CheckCircle,
} from "lucide-react";
import { getActivePlan, getPendingPlan } from "@/lib/plan";
import { PlanDocument, DayPlan } from "@/lib/schema";
import { BoredomRefreshDialog } from "@/components/boredom-refresh-dialog";
import { PlanSummary } from "@/components/plan-summary";
import Link from "next/link";
import { toast } from "sonner";
import { PlanCreatingScreen } from "@/components/plan-creating-screen";

export default function PlanPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [activePlan, setActivePlan] = useState<
    (PlanDocument & { id: string }) | null
  >(null);
  const [pendingPlan, setPendingPlan] = useState<
    (PlanDocument & { id: string }) | null
  >(null);
  const [fetching, setFetching] = useState(true);
  const [showBoredomDialog, setShowBoredomDialog] = useState(false);
  const [approving, setApproving] = useState(false);
  const [targetMacros, setTargetMacros] = useState<{ protein: number; fat: number; carbs: number } | undefined>();

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
        const [active, pending] = await Promise.all([
          getActivePlan(user.uid),
          getPendingPlan(user.uid),
        ]);
        setActivePlan(active);
        setPendingPlan(pending);
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

  // ユーザーの目標カロリーを取得（プラン概要表示用）
  useEffect(() => {
    if (user) {
      import("@/lib/db/firestore/userRepository").then(({ getOrCreateUser }) => {
        getOrCreateUser(user.uid).then((userDoc) => {
          if (userDoc) {
            setTargetMacros(userDoc.nutrition.pfc);
          }
        });
      });
    }
  }, [user]);

  // プラン作成中の場合は定期的にステータスをチェック
  useEffect(() => {
    if (isPlanCreating && user) {
      const interval = setInterval(async () => {
        await refreshProfile();
        // プランも再取得
        const [active, pending] = await Promise.all([
          getActivePlan(user.uid),
          getPendingPlan(user.uid),
        ]);
        setActivePlan(active);
        setPendingPlan(pending);
      }, 5000);
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
      await refreshProfile();
    } catch (error) {
      console.error("Generate plan error:", error);
      toast.error(error instanceof Error ? error.message : "プラン生成に失敗しました");
      setFetching(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!pendingPlan) return;
    setApproving(true);
    try {
      const res = await fetch("/api/plan/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          planId: pendingPlan.id,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "プラン承認に失敗しました");
      }
      const [active, pending] = await Promise.all([
        getActivePlan(user.uid),
        getPendingPlan(user.uid),
      ]);
      setActivePlan(active);
      setPendingPlan(pending);
      toast.success("プランを承認しました。レシピ詳細を生成中です。");
    } catch (error) {
      console.error("Approve plan error:", error);
      toast.error(error instanceof Error ? error.message : "プラン承認に失敗しました");
    } finally {
      setApproving(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!pendingPlan) return;
    setFetching(true);
    try {
      const res = await fetch("/api/plan/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          planId: pendingPlan.id,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "プラン拒否に失敗しました");
      }
      const pending = await getPendingPlan(user.uid);
      setPendingPlan(pending);
      toast.success("プランを拒否しました。新しいプランを生成します。");
      await refreshProfile();
      await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      await refreshProfile();
    } catch (error) {
      console.error("Reject plan error:", error);
      toast.error(error instanceof Error ? error.message : "プラン拒否に失敗しました");
      setFetching(false);
    }
  };

  const planToDisplay = pendingPlan || activePlan;
  const isPending = !!pendingPlan && !activePlan;

  if (!planToDisplay) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-4 animate-pop-in">
          <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">プランがありません</h1>
          <p className="text-muted-foreground">まずは2週間のプランを作成しましょう</p>
          <Button
            size="lg"
            className="rounded-full px-8 mt-4"
            onClick={handleGeneratePlan}
            disabled={fetching || isPlanCreating}
          >
            {fetching || isPlanCreating ? (
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

  const sortedDays = Object.entries(planToDisplay.days).sort(([a], [b]) => a.localeCompare(b));
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={`container max-w-2xl mx-auto py-8 px-4 space-y-6 ${isPending ? "pb-48" : "pb-24"}`}>
      {/* ページヘッダー（プロトタイプ準拠） */}
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-[#fff8e1] text-[#b8860b] px-3.5 py-1.5 rounded-full text-[0.8rem] font-bold">
              <Clock className="w-3.5 h-3.5" />
              {isPending ? "承認待ち" : "作成済み"}
            </div>
            <h1 className="text-[1.4rem] font-[800] text-[#2d3436] m-0">
              プランの{isPending ? "承認" : "確認"}
            </h1>
            <p className="text-[0.85rem] text-[#636e72]">
              {planToDisplay.startDate} 〜 7日間のプラン内容
            </p>
          </div>
          {!isPending && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2 border-[#edf2f7]"
                onClick={() => setShowBoredomDialog(true)}
                disabled={fetching}
              >
                <Sparkles className="w-4 h-4 text-primary" />
                飽きた
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* プラン概要（pending状態の時のみ表示） */}
      {isPending && (
        <PlanSummary days={planToDisplay.days} targetMacros={targetMacros} />
      )}

      {/* 承認/拒否ボタン（pending状態の時のみ表示） */}
      {isPending && (
        <div className="fixed bottom-16 left-0 right-0 bg-white p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] border-t z-50">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 h-14 rounded-[16px] font-bold text-[1rem] bg-[#f1f3f5] text-[#636e72] gap-2"
              onClick={handleRejectPlan}
              disabled={fetching}
            >
              <RotateCw className="w-5 h-5" />
              別の案を生成
            </Button>
            <Button
              className="flex-[1.5] h-14 rounded-[16px] font-bold text-[1rem] bg-[#2d3436] text-white hover:bg-[#1d2325] gap-2"
              onClick={handleApprovePlan}
              disabled={approving || fetching}
            >
              {approving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              このプランで決定
            </Button>
          </div>
          <div className="text-center mt-3 text-[0.8rem] text-[#636e72] underline cursor-pointer decoration-[#636e72]/30">
            一部のメニューだけを修正する
          </div>
        </div>
      )}

      {showBoredomDialog && user && (
        <BoredomRefreshDialog
          userId={user.uid}
          onComplete={() => {
            setShowBoredomDialog(false);
            getActivePlan(user.uid).then((plan) => setActivePlan(plan));
          }}
          onClose={() => setShowBoredomDialog(false)}
        />
      )}

      {/* 日別カード */}
      <div className="space-y-4">
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
              isPending={isPending}
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
  isPending?: boolean;
}

function DayCard({
  date,
  dayNumber,
  dayPlan,
  isToday,
  isPast,
  isPending = false,
}: DayCardProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
  };

  const isCheat = dayPlan.isCheatDay;

  return (
    <Card
      className={`overflow-hidden transition-all duration-300 border-0 rounded-[18px] ${
        isCheat
          ? "bg-[#fdfaff] shadow-[0_4px_12px_rgba(103,58,183,0.1)]"
          : "shadow-[0_4px_10px_rgba(0,0,0,0.04)]"
      } ${
        isToday ? "border-primary border-2 shadow-lg" : ""
      } ${isPast ? "opacity-60" : "hover:shadow-lg"}`}
    >
      <div className={`px-4 py-3 flex items-center justify-between font-bold text-white ${
        isCheat
          ? "bg-gradient-to-br from-[#512da8] to-[#673ab7]"
          : "bg-[#4CAF50]"
      }`}>
        <span>
          Day {dayNumber}: {formatDate(date)}{" "}
          {isCheat && (
            <span className="bg-[#ffc107] text-black text-[0.6rem] font-bold px-2 py-0.5 rounded-[4px] ml-2 align-middle inline-block">
              <Sparkles className="w-3 h-3 inline align-baseline mr-0.5" />
              CHEAT DAY
            </span>
          )}
        </span>
        <span>
          {(Number(dayPlan.totalNutrition?.calories) || 0).toLocaleString()} kcal
        </span>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-[#f1f3f5]">
          {(["breakfast", "lunch", "dinner"] as const).map((type) => {
            const meal = dayPlan.meals[type];
            const labels = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" };

            const content = (
              <div key={type} className="px-5 py-4 group cursor-pointer hover:bg-black/[0.02] transition-colors">
                <div className="flex flex-col gap-0.5">
                  <span className={`text-[0.7rem] font-bold uppercase tracking-tight ${isCheat ? "text-[#673ab7]" : "text-[#636e72]"}`}>
                    {labels[type]}
                  </span>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-[0.95rem] leading-tight text-[#2d3436]">
                      {meal.title}
                    </span>
                    {!isPending && <ChevronRight className="w-4 h-4 text-[#636e72]/40" />}
                  </div>
                  <div className={`mt-2 flex justify-between items-center text-[0.75rem] ${isCheat ? "text-[#673ab7]/70" : "text-[#636e72]"}`}>
                    <span className="font-medium">{Number(meal.nutrition?.calories || 0).toFixed(0)} kcal</span>
                    <span className="opacity-80 font-mono">
                      P:{Math.round(meal.nutrition?.protein || 0)} F:{Math.round(meal.nutrition?.fat || 0)} C:{Math.round(meal.nutrition?.carbs || 0)}
                    </span>
                  </div>
                </div>
              </div>
            );

            return isPending ? (
              content
            ) : (
              <Link key={type} href={`/recipe/${meal.recipeId}`} className="block">
                {content}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
