"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DayPlan } from "@/lib/schema";
import { AlertCircle } from "lucide-react";

interface PlanSummaryProps {
  days: Record<string, DayPlan>;
  targetMacros?: {
    protein: number;
    fat: number;
    carbs: number;
  };
}

const getStatusColor = (current: number, target: number, type: 'calories' | 'protein' | 'fat' | 'carbs') => {
  const ratio = current / target;
  if (type === 'fat') {
    if (ratio > 1.2) return 'bg-[#f44336]';
    if (ratio > 1.0) return 'bg-[#ff9800]';
    return 'bg-[#4CAF50]';
  }
  if (type === 'protein') {
    if (ratio < 0.9) return 'bg-[#ffc107]';
    return 'bg-[#4CAF50]';
  }
  if (ratio > 1.1) return 'bg-[#f44336]';
  if (ratio < 0.9) return 'bg-[#ff9800]';
  return 'bg-[#4CAF50]';
};

const getTextColor = (current: number, target: number, type: 'calories' | 'protein' | 'fat' | 'carbs') => {
  const ratio = current / target;
  if (type === 'fat') {
    if (ratio > 1.2) return 'text-[#f44336]';
    if (ratio > 1.0) return 'text-[#ff9800]';
    return 'text-[#4CAF50]';
  }
  if (type === 'protein') {
    if (ratio < 0.9) return 'text-[#ffc107]';
    return 'text-[#4CAF50]';
  }
  if (ratio > 1.1) return 'text-[#f44336]';
  if (ratio < 0.9) return 'text-[#ff9800]';
  return 'text-[#4CAF50]';
};

const NutrientRow = ({ 
  label, 
  current, 
  target, 
  unit, 
  type 
}: { 
  label: string, 
  current: number, 
  target: number, 
  unit: string,
  type: 'calories' | 'protein' | 'fat' | 'carbs'
}) => {
  const ratio = Math.min(current / target, 1.5);
  const progressWidth = Math.min(ratio * 100, 100);
  const markerLeft = current > target ? (target / current) * 100 : 100;
  const isOver = current > target * 1.1;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[0.75rem] font-bold">
        <span>{label}</span>
        <span className={getTextColor(current, target, type)}>
          {current.toFixed(1)}{unit} / 目標 {target}{unit}
        </span>
      </div>
      <div className="relative h-2.5 w-full bg-[#edf2f7] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-out ${getStatusColor(current, target, type)}`}
          style={{ width: `${progressWidth}%` }}
        />
        <div 
          className="absolute top-0 w-[3px] h-full bg-[#2d3436] z-10 shadow-[0_0_4px_rgba(0,0,0,0.2)]"
          style={{ left: `${markerLeft}%` }}
        />
      </div>
      {(isOver || (type === 'fat' && current > target)) && (
        <div className="flex items-center gap-1 text-[0.7rem] text-[#f44336] font-medium">
          <AlertCircle className="w-3 h-3" />
          目標を{current > target * 1.5 ? "大幅に" : ""}超過しています
        </div>
      )}
    </div>
  );
};

export function PlanSummary({ days, targetMacros }: PlanSummaryProps) {
  // チートデイを除外した通常日のみを抽出
  const normalDays = Object.values(days).filter((day) => !day.isCheatDay);
  
  const allMeals = normalDays.flatMap((day) => {
    const meals = [
      day.meals.breakfast,
      day.meals.lunch,
      day.meals.dinner,
    ];
    if (day.meals.snack) {
      meals.push(day.meals.snack);
    }
    return meals;
  });

  const avgCalories =
    allMeals.length > 0
      ? allMeals.reduce((sum, meal) => {
          const calories = Number(meal.nutrition?.calories) || 0;
          return sum + (isNaN(calories) ? 0 : calories);
        }, 0) / normalDays.length
      : 0;

  const avgPFC = {
    protein:
      allMeals.length > 0
        ? allMeals.reduce((sum, meal) => {
            const protein = Number(meal.nutrition?.protein) || 0;
            return sum + (isNaN(protein) ? 0 : protein);
          }, 0) / normalDays.length
        : 0,
    fat:
      allMeals.length > 0
        ? allMeals.reduce((sum, meal) => {
            const fat = Number(meal.nutrition?.fat) || 0;
            return sum + (isNaN(fat) ? 0 : fat);
          }, 0) / normalDays.length
        : 0,
    carbs:
      allMeals.length > 0
        ? allMeals.reduce((sum, meal) => {
            const carbs = Number(meal.nutrition?.carbs) || 0;
            return sum + (isNaN(carbs) ? 0 : carbs);
          }, 0) / normalDays.length
        : 0,
  };

  const tagFrequency: Record<string, number> = {};
  allMeals.forEach((meal) => {
    meal.tags?.forEach((tag) => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const cheatDaysCount = Object.values(days).filter((day) => day.isCheatDay).length;

  return (
    <Card className="mb-6 border border-[#edf2f7] shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden">
      <CardContent className="space-y-6 p-5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[0.9rem] font-bold text-[#2d3436]">
            📊 プラン概要
          </span>
          <span className="text-[0.7rem] text-[#636e72] bg-[#f1f3f5] px-2 py-0.5 rounded-[4px]">
            1日あたりの平均
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col">
            <span className="text-[1.2rem] font-[800] leading-tight text-[#2d3436]">
              {Math.round(avgCalories).toLocaleString()}
            </span>
            <span className="text-[0.7rem] text-[#636e72]">kcal</span>
          </div>
          <div className="flex flex-col">
            <span 
              className="text-[1.2rem] font-[800] leading-tight"
              style={{ color: targetMacros && avgPFC.protein >= targetMacros.protein * 0.9 ? "#4CAF50" : "#ff9800" }}
            >
              {Math.round(avgPFC.protein)}g
            </span>
            <span className="text-[0.7rem] text-[#636e72]">Protein</span>
          </div>
          <div className="flex flex-col">
            <span 
              className="text-[1.2rem] font-[800] leading-tight"
              style={{ color: targetMacros && avgPFC.fat > targetMacros.fat ? "#f44336" : "#4CAF50" }}
            >
              {Math.round(avgPFC.fat)}g
            </span>
            <span className="text-[0.7rem] text-[#636e72]">Fat</span>
          </div>
        </div>

        <div className="grid gap-5">
          {targetMacros && (
            <>
              <NutrientRow 
                label="脂質 (F)" 
                current={avgPFC.fat} 
                target={targetMacros.fat} 
                unit="g" 
                type="fat"
              />
              <NutrientRow 
                label="炭水化物 (C)" 
                current={avgPFC.carbs} 
                target={targetMacros.carbs} 
                unit="g" 
                type="carbs"
              />
              <NutrientRow 
                label="タンパク質 (P)" 
                current={avgPFC.protein} 
                target={targetMacros.protein} 
                unit="g" 
                type="protein"
              />
            </>
          )}
        </div>

        <div className="pt-2 border-t border-[#f1f3f5] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {sortedTags.slice(0, 4).map(([tag]) => (
                <span key={tag} className="text-[0.65rem] bg-[#f1f3f5] px-2 py-0.5 rounded-[4px] text-[#636e72]">
                  {tag}
                </span>
              ))}
            </div>
            {cheatDaysCount > 0 && (
              <span className="text-[0.65rem] font-bold bg-[#fff8e1] text-[#b8860b] px-2 py-0.5 rounded-full border border-[#fff3cd]">
                チートデイ {cheatDaysCount}日間
              </span>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
