"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DayPlan } from "@/lib/schema";
import { Flame, TrendingUp, Tag } from "lucide-react";

interface PlanSummaryProps {
  days: Record<string, DayPlan>;
  targetCalories?: number;
}

/**
 * プラン概要コンポーネント
 * 14日間の統計情報、栄養バランス、タグ分析を表示
 */
export function PlanSummary({ days, targetCalories }: PlanSummaryProps) {
  // すべての食事を取得
  const allMeals = Object.values(days).flatMap((day) => [
    day.meals.breakfast,
    day.meals.lunch,
    day.meals.dinner,
  ]);

  // 平均カロリー（NaNチェック付き）
  const avgCalories =
    allMeals.length > 0
      ? allMeals.reduce((sum, meal) => {
          const calories = Number(meal.nutrition?.calories) || 0;
          return sum + (isNaN(calories) ? 0 : calories);
        }, 0) / allMeals.length
      : 0;

  // 平均PFC（NaNチェック付き）
  const avgPFC = {
    protein:
      allMeals.length > 0
        ? allMeals.reduce((sum, meal) => {
            const protein = Number(meal.nutrition?.protein) || 0;
            return sum + (isNaN(protein) ? 0 : protein);
          }, 0) / allMeals.length
        : 0,
    fat:
      allMeals.length > 0
        ? allMeals.reduce((sum, meal) => {
            const fat = Number(meal.nutrition?.fat) || 0;
            return sum + (isNaN(fat) ? 0 : fat);
          }, 0) / allMeals.length
        : 0,
    carbs:
      allMeals.length > 0
        ? allMeals.reduce((sum, meal) => {
            const carbs = Number(meal.nutrition?.carbs) || 0;
            return sum + (isNaN(carbs) ? 0 : carbs);
          }, 0) / allMeals.length
        : 0,
  };

  // タグの出現頻度
  const tagFrequency: Record<string, number> = {};
  allMeals.forEach((meal) => {
    meal.tags?.forEach((tag) => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  });

  // タグを出現頻度順にソート
  const sortedTags = Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // 上位10個

  // チートデイの日付を取得
  const cheatDays = Object.entries(days)
    .filter(([, day]) => day.isCheatDay)
    .map(([date]) => date);

  // 目標カロリーとの比較
  const calorieDiff = targetCalories
    ? avgCalories - targetCalories
    : null;
  const calorieDiffPercent = targetCalories && calorieDiff !== null
    ? Math.round((calorieDiff / targetCalories) * 100)
    : null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          プラン概要
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 栄養統計 */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4" />
            14日間の平均栄養価
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">{avgCalories.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">kcal</div>
              {targetCalories && calorieDiffPercent !== null && (
                <div
                  className={`text-xs mt-1 ${
                    Math.abs(calorieDiffPercent) <= 5
                      ? "text-green-600"
                      : calorieDiffPercent > 0
                      ? "text-orange-600"
                      : "text-blue-600"
                  }`}
                >
                  {calorieDiffPercent > 0 ? "+" : ""}
                  {calorieDiffPercent}%
                </div>
              )}
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">
                {Math.round(avgPFC.protein)}
              </div>
              <div className="text-xs text-muted-foreground">タンパク質(g)</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">{Math.round(avgPFC.fat)}</div>
              <div className="text-xs text-muted-foreground">脂質(g)</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">
                {Math.round(avgPFC.carbs)}
              </div>
              <div className="text-xs text-muted-foreground">炭水化物(g)</div>
            </div>
          </div>
        </div>

        {/* タグ分析 */}
        {sortedTags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              使用ジャンル・タグ
            </h3>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map(([tag, count]) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag} ({count}回)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* チートデイ情報 */}
        {cheatDays.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">チートデイ</h3>
            <div className="text-sm text-muted-foreground">
              {cheatDays.length}日間: {cheatDays.join(", ")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
