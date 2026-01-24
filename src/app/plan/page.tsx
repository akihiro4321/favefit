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
import { getActivePlan, getPendingPlan } from "@/lib/plan";
import { PlanDocument, DayPlan } from "@/lib/schema";
import { BoredomRefreshDialog } from "@/components/boredom-refresh-dialog";
import { PlanSummary } from "@/components/plan-summary";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { PlanCreatingScreen } from "@/components/plan-creating-screen";
import { PlanRejectionFeedbackDialog } from "@/components/plan-rejection-feedback-dialog";

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
  const [targetCalories, setTargetCalories] = useState<number | undefined>();
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [showRejectFeedbackDialog, setShowRejectFeedbackDialog] = useState(false);

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
      import("@/lib/user").then(({ getOrCreateUser }) => {
        getOrCreateUser(user.uid).then((userDoc) => {
          if (userDoc) {
            setTargetCalories(userDoc.nutrition.dailyCalories);
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

  // プラン作成中の場合はスピナーを表示
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

      // プロフィールを更新してplanCreationStatusを確認
      // これにより、isPlanCreatingがtrueになり、プラン作成中画面が表示される
      await refreshProfile();
      
      // プラン作成中画面が表示されるため、ここではプランを再取得しない
      // プラン生成完了後、useEffectのポーリングで自動的にプランが取得される
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

      // プランを再取得（承認後はactiveになる）
      const [active, pending] = await Promise.all([
        getActivePlan(user.uid),
        getPendingPlan(user.uid),
      ]);
      setActivePlan(active);
      setPendingPlan(pending);

      toast.success("プランを承認しました。レシピ詳細を生成中です。完了まで1〜2分かかる場合があります。");
    } catch (error) {
      console.error("Approve plan error:", error);
      toast.error(error instanceof Error ? error.message : "プラン承認に失敗しました");
    } finally {
      setApproving(false);
    }
  };

  const handleRejectPlan = () => {
    if (!pendingPlan) return;
    setShowRejectFeedbackDialog(true);
  };

  const executeRejectPlan = async (feedback: string = "") => {
    if (!pendingPlan) return;

    setFetching(true);
    try {
      // プランを拒否
      const res = await fetch("/api/plan/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          planId: pendingPlan.id,
          feedback: feedback || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "プラン拒否に失敗しました");
      }

      // プランを再取得（拒否後はプランなし状態になる）
      const pending = await getPendingPlan(user.uid);
      setPendingPlan(pending);

      toast.success("プランを拒否しました。フィードバックを参考に新しいプランを生成します。");
      
      // プロフィールを更新
      await refreshProfile();

      // フィードバックを参考に新しいプラン生成を自動的に開始
      const generateRes = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!generateRes.ok) {
        const error = await generateRes.json();
        throw new Error(error.error || "プラン生成に失敗しました");
      }

      // プロフィールを更新してplanCreationStatusを確認
      // これにより、isPlanCreatingがtrueになり、プラン作成中画面が表示される
      await refreshProfile();
      
      // プラン作成中画面が表示されるため、ここではプランを再取得しない
      // プラン生成完了後、useEffectのポーリングで自動的にプランが取得される
    } catch (error) {
      console.error("Reject plan error:", error);
      toast.error(error instanceof Error ? error.message : "プラン拒否または生成に失敗しました");
      setFetching(false);
    }
  };

  const handleRefreshPlan = () => {
    if (!activePlan) return;
    setShowRefreshDialog(true);
  };

  const executeRefreshPlan = async () => {
    if (!activePlan) return;

    setFetching(true);
    try {
      // 一括再生成は新規プラン生成と同じフローを使用
      // 既存のActiveプランは自動的にArchivedに変更される
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "一括再生成に失敗しました");
      }

      // プロフィールを更新してplanCreationStatusを確認
      // これにより、isPlanCreatingがtrueになり、プラン作成中画面が表示される
      await refreshProfile();
      
      toast.success("14日間のプランを一括再生成しました。プラン生成中です...");
      
      // プラン作成中画面が表示されるため、ここではプランを再取得しない
      // プラン生成完了後、useEffectのポーリングで自動的にプランが取得される
    } catch (error) {
      console.error("Refresh plan error:", error);
      toast.error(error instanceof Error ? error.message : "一括再生成に失敗しました");
      setFetching(false);
    }
  };

  // pending状態のプランを表示（承認待ち）
  const planToDisplay = pendingPlan || activePlan;
  const isPending = !!pendingPlan && !activePlan;

  if (!planToDisplay) {
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

  // 日付でソート
  const sortedDays = Object.entries(planToDisplay.days).sort(([a], [b]) =>
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
            {planToDisplay.startDate} 〜
          </p>
          {isPending && (
            <Badge variant="outline" className="mt-2">
              承認待ち
            </Badge>
          )}
        </div>
        {!isPending && (
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
        )}
      </div>

      {/* プラン概要（pending状態の時のみ表示） */}
      {isPending && (
        <PlanSummary days={planToDisplay.days} targetCalories={targetCalories} />
      )}

      {/* 承認/拒否ボタン（pending状態の時のみ表示） */}
      {isPending && (
        <div className="flex gap-4 justify-center pb-4">
          <Button
            size="lg"
            className="rounded-full px-8 gap-2"
            onClick={handleApprovePlan}
            disabled={approving || fetching}
          >
            {approving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                承認中...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                このプランで進める
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 gap-2"
            onClick={handleRejectPlan}
            disabled={fetching}
          >
            <XCircle className="w-5 h-5" />
            別のプランを生成する
          </Button>
        </div>
      )}

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

      {/* 一括再生成確認ダイアログ */}
      <ConfirmDialog
        open={showRefreshDialog}
        onOpenChange={setShowRefreshDialog}
        title="14日間のプランを一括で再生成しますか？"
        description="現在のプランはアーカイブされ、新しいプランが生成されます。生成後、プランを確認して承認してください。"
        confirmText="再生成する"
        cancelText="キャンセル"
        onConfirm={executeRefreshPlan}
      />

      {/* プラン拒否フィードバックダイアログ */}
      <PlanRejectionFeedbackDialog
        open={showRejectFeedbackDialog}
        onOpenChange={setShowRejectFeedbackDialog}
        onConfirm={executeRejectPlan}
      />

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
          <div className="flex items-center gap-2 flex-wrap">
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
          <div className="text-right">
            <div className="text-sm font-medium">
              {(() => {
                const calories = Number(dayPlan.totalNutrition?.calories) || 0;
                return isNaN(calories) ? 0 : calories;
              })()}{" "}
              kcal
            </div>
            {isPending && dayPlan.totalNutrition && (
              <div className="text-xs text-muted-foreground">
                P:
                {(() => {
                  const protein = Number(dayPlan.totalNutrition.protein) || 0;
                  return Math.round(isNaN(protein) ? 0 : protein);
                })()}
                g F:
                {(() => {
                  const fat = Number(dayPlan.totalNutrition.fat) || 0;
                  return Math.round(isNaN(fat) ? 0 : fat);
                })()}
                g C:
                {(() => {
                  const carbs = Number(dayPlan.totalNutrition.carbs) || 0;
                  return Math.round(isNaN(carbs) ? 0 : carbs);
                })()}
                g
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="space-y-3">
          {(["breakfast", "lunch", "dinner"] as const).map((type) => {
            const meal = dayPlan.meals[type];
            const labels = { breakfast: "朝", lunch: "昼", dinner: "夜" };

            if (isPending) {
              // pending状態: 詳細表示
              return (
                <div key={type} className="border-b border-dashed pb-2 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {labels[type]}
                        </span>
                        <span className="font-medium text-sm break-words">
                          {meal.title}
                        </span>
                      </div>
                      {meal.tags && meal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {meal.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const calories = Number(meal.nutrition?.calories) || 0;
                          return isNaN(calories) ? 0 : calories;
                        })()}
                        kcal | P:
                        {(() => {
                          const protein = Number(meal.nutrition?.protein) || 0;
                          return isNaN(protein) ? 0 : protein;
                        })()}
                        g F:
                        {(() => {
                          const fat = Number(meal.nutrition?.fat) || 0;
                          return isNaN(fat) ? 0 : fat;
                        })()}
                        g C:
                        {(() => {
                          const carbs = Number(meal.nutrition?.carbs) || 0;
                          return isNaN(carbs) ? 0 : carbs;
                        })()}
                        g
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else {
              // active状態: 簡易表示（既存の表示）
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
            }
          })}
        </div>
      </CardContent>
    </Card>
  );
}
