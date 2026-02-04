"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronLeft,
  Heart,
  RefreshCw,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { DayPlan, MealSlot } from "@/lib/schema";
import { FeedbackForm } from "@/components/feedback-form";
import { Star } from "lucide-react";

export default function RecipePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const recipeId = params.id as string;

  const [recipe, setRecipe] = useState<MealSlot | null>(null);
  const [fetching, setFetching] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [planInfo, setPlanInfo] = useState<{ planId: string; date: string; mealType: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!user) return;
      try {
        const planRes = await fetch('/api/plan/get-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        });
        const planData = await planRes.json();
        const plan = planData.data?.plan;

        if (plan) {
          // プランから該当レシピを検索
          for (const [date, dayPlan] of Object.entries(plan.days as Record<string, DayPlan>)) {
            for (const [slot, meal] of Object.entries(dayPlan.meals)) {
              if ((meal as MealSlot).recipeId === recipeId) {
                const currentRecipe = meal as MealSlot;
                
                // プラン情報を保存（評価フォーム用）
                setPlanInfo({ planId: plan.id, date, mealType: slot });
                
                // 詳細（材料・手順）が不足している場合は API を叩いて生成・保存する
                if (!currentRecipe.ingredients || currentRecipe.ingredients.length === 0) {
                  setFetching(true); // 生成中表示のために true に戻す
                  const res = await fetch("/api/recipe/get-detail", {
                    method: "POST",
                    body: JSON.stringify({
                      userId: user.uid,
                      planId: plan.id,
                      date,
                      mealType: slot,
                    }),
                  });
                  if (!res.ok) throw new Error("レシピ詳細の取得に失敗しました");
                  const data = await res.json();
                  if (data.success) {
                    setRecipe(data.data.recipe);
                  } else {
                    setRecipe(currentRecipe); // 生成失敗時は名目のみ表示
                  }
                } else {
                  setRecipe(currentRecipe);
                }
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching recipe:", error);
      } finally {
        setFetching(false);
      }
    };
    if (user && recipeId) {
      fetchRecipe();
    }
  }, [user, recipeId]);

  const handleComplete = async () => {
    if (!user || !recipe) return;
    setCompleting(true);
    try {
      await fetch('/api/history/mark-as-cooked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, recipeId }),
      });
      setRecipe((prev) => (prev ? { ...prev, status: "completed" } : null));
      // 評価フォームを表示
      setShowFeedback(true);
    } catch (error) {
      console.error(error);
    } finally {
      setCompleting(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) return;
    setFavoriting(true);
    try {
      await fetch('/api/history/add-to-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, recipeId }),
      });
      alert("また作りたいリストに追加しました！");
    } catch (error) {
      console.error(error);
    } finally {
      setFavoriting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">レシピの詳細を準備中...</p>
      </div>
    );
  }

  if (!user || !recipe) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">レシピが見つかりません</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          戻る
        </Button>
      </div>
    );
  }

  const isCompleted = recipe.status === "completed";

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">{recipe.title}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFavorite}
          disabled={favoriting}
        >
          {favoriting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Heart className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* 栄養情報 */}
      <div className="flex gap-4 justify-center">
        <div className="text-center">
          <Flame className="w-5 h-5 mx-auto text-primary" />
          <p className="text-sm font-medium">{recipe.nutrition.calories}</p>
          <p className="text-xs text-muted-foreground">kcal</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{recipe.nutrition.protein}g</p>
          <p className="text-xs text-muted-foreground">タンパク質</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{recipe.nutrition.fat}g</p>
          <p className="text-xs text-muted-foreground">脂質</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{recipe.nutrition.carbs}g</p>
          <p className="text-xs text-muted-foreground">炭水化物</p>
        </div>
      </div>

      {/* タグ */}
      {recipe.tags && (
        <div className="flex flex-wrap gap-2 justify-center">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* 材料・手順 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              材料
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {recipe.ingredients.map((item, i) => (
                  <li key={i} className="flex justify-between items-center border-b border-dashed border-muted py-1 last:border-0">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.amount}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                材料情報はプラン生成時に保存されます
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              手順
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.steps && recipe.steps.length > 0 ? (
              <ol className="space-y-3 list-decimal list-inside text-sm">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                手順情報はプラン生成時に保存されます
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 評価フォーム */}
      {showFeedback && user && (
        <div className="pt-4">
          <FeedbackForm
            userId={user.uid}
            recipeId={recipeId}
            onComplete={() => {
              setShowFeedback(false);
              router.push("/home");
            }}
          />
        </div>
      )}

      {/* アクションボタン */}
      {!showFeedback && (
        <div className="flex gap-4 pt-4 sticky bottom-20 z-10 bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
          {!isCompleted ? (
            <>
              <Button
                className="flex-1 h-12 rounded-full"
                onClick={handleComplete}
                disabled={completing}
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    作った！
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-full"
                onClick={() => router.push(`/fridge?swap=${recipeId}&planId=${planInfo?.planId}&date=${planInfo?.date}&mealType=${planInfo?.mealType}`)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                別のレシピに変更
              </Button>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <div className="flex-1 text-center py-3">
                <Badge variant="default" className="px-4 py-2 text-base">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  完了済み
                </Badge>
              </div>
              <Button
                variant="outline"
                className="h-12 rounded-full"
                onClick={() => setShowFeedback(true)}
              >
                <Star className="w-4 h-4 mr-2" />
                評価する
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
