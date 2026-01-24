"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface Recipe {
  recipeId: string;
  title: string;
  description: string;
  tags: string[];
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

interface BoredomRefreshDialogProps {
  userId: string;
  onComplete: () => void;
  onClose: () => void;
}

export function BoredomRefreshDialog({
  userId,
  onComplete,
  onClose,
}: BoredomRefreshDialogProps) {
  const [step, setStep] = useState<"loading" | "selecting" | "refreshing" | "completed">("loading");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selections, setSelections] = useState<Record<string, "good" | "bad" | null>>({});
  const [error, setError] = useState<string | null>(null);

  // ステップ1: 5レシピを取得
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch("/api/suggest-boredom-recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "レシピの取得に失敗しました");
        }

        const data = await res.json();
        setRecipes(data.recipes || []);
        setStep("selecting");
      } catch (err) {
        console.error("Fetch recipes error:", err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    };

    fetchRecipes();
  }, [userId]);

  const handleSelect = (recipeId: string, value: "good" | "bad") => {
    setSelections((prev) => ({
      ...prev,
      [recipeId]: prev[recipeId] === value ? null : value,
    }));
  };

  const handleSubmit = async () => {
    const goodRecipes = recipes
      .filter((r) => selections[r.recipeId] === "good")
      .map((r) => r.title);
    const badRecipes = recipes
      .filter((r) => selections[r.recipeId] === "bad")
      .map((r) => r.title);

    if (goodRecipes.length === 0 && badRecipes.length === 0) {
      alert("少なくとも1つはgoodまたはbadを選択してください");
      return;
    }

    setStep("refreshing");

    try {
      const res = await fetch("/api/refresh-plan-with-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          goodRecipes,
          badRecipes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "プランのリフレッシュに失敗しました");
      }

      setStep("completed");
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error("Refresh plan error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("selecting");
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4">
            <p className="text-destructive">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                閉じる
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                再試行
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6 space-y-6">
          {step === "loading" && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">
                新しいレシピを提案しています...
              </p>
            </div>
          )}

          {step === "selecting" && (
            <>
              <div className="text-center space-y-2">
                <Sparkles className="w-8 h-8 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">気分に合わせたレシピを選んでください</h2>
                <p className="text-sm text-muted-foreground">
                  気に入ったものは「good」、気に入らないものは「bad」を選んでください
                </p>
              </div>

              <div className="space-y-4">
                {recipes.map((recipe) => {
                  const selection = selections[recipe.recipeId];
                  return (
                    <Card
                      key={recipe.recipeId}
                      className={`transition-all ${
                        selection === "good"
                          ? "border-green-500 bg-green-50/50"
                          : selection === "bad"
                          ? "border-red-500 bg-red-50/50"
                          : ""
                      }`}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium text-lg">{recipe.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {recipe.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {recipe.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {recipe.nutrition.calories} kcal
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant={selection === "good" ? "default" : "outline"}
                              size="sm"
                              className={`flex-1 ${
                                selection === "good"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : ""
                              }`}
                              onClick={() => handleSelect(recipe.recipeId, "good")}
                            >
                              <ThumbsUp className="w-4 h-4 mr-1" />
                              Good
                            </Button>
                            <Button
                              variant={selection === "bad" ? "default" : "outline"}
                              size="sm"
                              className={`flex-1 ${
                                selection === "bad"
                                  ? "bg-red-500 hover:bg-red-600"
                                  : ""
                              }`}
                              onClick={() => handleSelect(recipe.recipeId, "bad")}
                            >
                              <ThumbsDown className="w-4 h-4 mr-1" />
                              Bad
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  キャンセル
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={
                    Object.values(selections).filter((s) => s !== null).length === 0
                  }
                >
                  プランをリフレッシュ
                </Button>
              </div>
            </>
          )}

          {step === "refreshing" && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">
                あなたの好みに合わせてプランを更新しています...
              </p>
            </div>
          )}

          {step === "completed" && (
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">プランを更新しました！</h2>
              <p className="text-muted-foreground">
                新しいプランを用意しました！
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
