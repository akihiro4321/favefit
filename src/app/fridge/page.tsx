"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Refrigerator,
  ChefHat,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface SuggestedRecipe {
  recipeId: string;
  title: string;
  description: string;
  tags: string[];
  ingredients: string[];
  steps: string[];
  additionalIngredients: string[];
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

export default function FridgePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ingredients, setIngredients] = useState("");
  const [comment, setComment] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedRecipe[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previousSuggestions, setPreviousSuggestions] = useState<string[]>([]);
  const [swapInfo, setSwapInfo] = useState<{
    planId: string;
    date: string;
    mealType: string;
    oldRecipeId: string;
  } | null>(null);
  const [swapping, setSwapping] = useState(false);

  // URLパラメータからswap情報を取得
  useEffect(() => {
    const swap = searchParams.get("swap");
    const planId = searchParams.get("planId");
    const date = searchParams.get("date");
    const mealType = searchParams.get("mealType");

    if (swap && planId && date && mealType) {
      setSwapInfo({
        planId,
        date,
        mealType,
        oldRecipeId: swap,
      });
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    if (!ingredients.trim() || !user || !profile) return;

    setGenerating(true);

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          ingredients: ingredients.split(/[,、\n]/).map((s) => s.trim()).filter(Boolean),
          comment: comment || undefined,
          previousSuggestions: previousSuggestions.length > 0 ? previousSuggestions : undefined,
        }),
      });

      if (!res.ok) throw new Error("提案に失敗しました");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setComment("");
    } catch (error) {
      console.error(error);
      alert("提案の生成中にエラーが発生しました。");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = (feedback: string) => {
    setPreviousSuggestions((prev) => [
      ...prev,
      ...suggestions.map((s) => s.title),
    ]);
    setComment(feedback);
  };

  const handleSelect = async (recipe: SuggestedRecipe) => {
    // 差し替えモードの場合
    if (swapInfo) {
      setSwapping(true);
      try {
        // レシピをMealSlot形式に変換
        const mealSlot = {
          recipeId: recipe.recipeId,
          title: recipe.title,
          status: "swapped" as const,
          nutrition: {
            calories: recipe.nutrition.calories,
            protein: recipe.nutrition.protein || 0,
            fat: recipe.nutrition.fat || 0,
            carbs: recipe.nutrition.carbs || 0,
          },
          tags: recipe.tags,
          ingredients: recipe.ingredients || [],
          steps: recipe.steps || [],
        };

        const res = await fetch("/api/recipe?action=swap-meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            planId: swapInfo.planId,
            date: swapInfo.date,
            mealType: swapInfo.mealType,
            newMeal: mealSlot,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "レシピの差し替えに失敗しました");
        }

        alert("レシピを差し替えました！");
        router.push("/home");
      } catch (error) {
        console.error("Swap meal error:", error);
        alert(error instanceof Error ? error.message : "レシピの差し替えに失敗しました");
      } finally {
        setSwapping(false);
      }
    } else {
      // 通常モード：レシピ詳細画面へ
      router.push(`/recipe/${recipe.recipeId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="space-y-2 animate-slide-up">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Refrigerator className="w-6 h-6 text-primary" />
          冷蔵庫からメニュー提案
        </h1>
        <p className="text-sm text-muted-foreground">
          {swapInfo
            ? "プラン内のレシピを差し替えるレシピを選んでください"
            : "手元にある食材から、AIがレシピを提案します"}
        </p>
      </div>

      {/* 入力フォーム */}
      {suggestions.length === 0 && (
        <Card className="animate-pop-in">
          <CardHeader>
            <CardTitle className="text-base">食材を入力</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="例: 鶏もも肉、キャベツ、にんじん、卵..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className="min-h-[100px]"
            />
            <Textarea
              placeholder="希望があれば（例: さっぱりしたもの、辛いもの）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              onClick={handleSubmit}
              disabled={generating || !ingredients.trim()}
              className="w-full rounded-full"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ChefHat className="w-4 h-4 mr-2" />
                  レシピを提案してもらう
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 提案結果 */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold">3つのレシピを提案します</h2>
          </div>

          {suggestions.map((recipe, idx) => (
            <Card
              key={idx}
              className={`cursor-pointer hover:shadow-lg transition-all ${
                swapping ? "opacity-50" : ""
              }`}
              onClick={() => !swapping && handleSelect(recipe)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-medium">{recipe.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {recipe.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {recipe.additionalIngredients.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        追加で必要: {recipe.additionalIngredients.join(", ")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 再提案ボタン */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => handleRegenerate("もっとさっぱりしたもの")}
            >
              <ThumbsUp className="w-4 h-4 mr-1" />
              さっぱり系で
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => handleRegenerate("もっとこってりしたもの")}
            >
              <ThumbsDown className="w-4 h-4 mr-1" />
              こってり系で
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setSuggestions([]);
              setPreviousSuggestions([]);
            }}
          >
            食材を入力し直す
          </Button>
        </div>
      )}
    </div>
  );
}
