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
import { getActivePlan } from "@/lib/plan";
import { addToFavorites, markAsCooked } from "@/lib/recipeHistory";
import { MealSlot } from "@/lib/schema";

export default function RecipePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const recipeId = params.id as string;

  const [recipe, setRecipe] = useState<MealSlot | null>(null);
  const [fetching, setFetching] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!user) return;
      try {
        const plan = await getActivePlan(user.uid);
        if (plan) {
          // プランから該当レシピを検索
          for (const [, dayPlan] of Object.entries(plan.days)) {
            for (const [, meal] of Object.entries(dayPlan.meals)) {
              if ((meal as MealSlot).recipeId === recipeId) {
                setRecipe(meal as MealSlot);
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
      await markAsCooked(user.uid, recipeId);
      setRecipe((prev) => (prev ? { ...prev, status: "completed" } : null));
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
      await addToFavorites(user.uid, recipeId);
      alert("お気に入りに追加しました！");
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

      {/* プレースホルダー: 材料・手順 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">材料・手順</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>（詳細なレシピ情報はプラン生成時に保存されます）</p>
        </CardContent>
      </Card>

      {/* アクションボタン */}
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
              onClick={() => router.push("/fridge")}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              別のレシピに変更
            </Button>
          </>
        ) : (
          <div className="flex-1 text-center py-3">
            <Badge variant="default" className="px-4 py-2 text-base">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              完了済み
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
