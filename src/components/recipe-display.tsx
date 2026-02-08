"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Flame, Dumbbell, Droplets, Wheat } from "lucide-react";
import { Recipe } from "@/server/ai/functions/recipe-generator";

interface RecipeDisplayProps {
  recipe: Recipe;
}

export function RecipeDisplay({ recipe }: RecipeDisplayProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="overflow-hidden border-2 border-primary/20">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className="bg-background/50">
              AI Generated
            </Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-1" />
              {recipe.cookingTime}分
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {recipe.title}
          </CardTitle>
          <CardDescription className="text-base text-foreground/80 mt-2 italic">
            &quot;{recipe.description}&quot;
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* 栄養価表示 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NutritionItem
              icon={<Flame className="w-4 h-4 text-orange-500" />}
              label="カロリー"
              value={`${recipe.nutrition.calories}kcal`}
            />
            <NutritionItem
              icon={<Dumbbell className="w-4 h-4 text-blue-500" />}
              label="タンパク質"
              value={`${recipe.nutrition.protein}g`}
            />
            <NutritionItem
              icon={<Droplets className="w-4 h-4 text-yellow-600" />}
              label="脂質"
              value={`${recipe.nutrition.fat}g`}
            />
            <NutritionItem
              icon={<Wheat className="w-4 h-4 text-green-600" />}
              label="炭水化物"
              value={`${recipe.nutrition.carbs}g`}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 材料リスト */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg border-l-4 border-primary pl-2">
                材料
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center text-sm border-b border-dashed pb-1"
                  >
                    <span>{item.name}</span>
                    <span className="font-medium text-muted-foreground">
                      {item.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 調理手順 */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg border-l-4 border-primary pl-2">
                作り方
              </h3>
              <div className="space-y-4">
                {recipe.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NutritionItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border/50">
      <div className="mb-1">{icon}</div>
      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
        {label}
      </span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
