'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { getRecipe, SavedRecipe } from '@/lib/recipe';
import { ChevronLeft, Clock, Flame, Loader2, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RecipeDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecipe() {
      if (user && id) {
        setLoading(true);
        const data = await getRecipe(user.uid, id);
        setRecipe(data);
        setLoading(false);
      }
    }
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else {
        loadRecipe();
      }
    }
  }, [user, id, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-xl font-medium text-muted-foreground">レシピが見つかりませんでした。</p>
        <Button asChild variant="outline">
          <Link href="/recipes">一覧に戻る</Link>
        </Button>
      </div>
    );
  }

  // PFCバランスの計算
  const totalGrams = recipe.nutrition.protein + recipe.nutrition.fat + recipe.nutrition.carbs;
  const proteinPercent = totalGrams > 0 ? (recipe.nutrition.protein / totalGrams) * 100 : 0;
  const fatPercent = totalGrams > 0 ? (recipe.nutrition.fat / totalGrams) * 100 : 0;
  const carbPercent = totalGrams > 0 ? (recipe.nutrition.carbs / totalGrams) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* 戻るボタン */}
      <div className="flex items-center gap-4 mb-4 md:mb-6">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/recipes">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-lg md:text-xl font-bold line-clamp-1">{recipe.title}</h1>
      </div>

      <div className="space-y-6 md:space-y-8">
        {/* 基本情報 */}
        <section className="space-y-4">
          <div className="flex justify-between items-start">
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed flex-1">
              {recipe.description}
            </p>
          </div>
          <div className="flex gap-4 md:gap-6 items-center bg-muted/30 p-3 md:p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="font-medium text-sm md:text-base">{recipe.cookingTime}分</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
              <span className="font-medium text-sm md:text-base">{recipe.nutrition.calories}kcal</span>
            </div>
          </div>
        </section>

        <Separator />

        {/* 栄養バランス (PFC) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            栄養バランス
          </h2>
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>タンパク質 (P)</span>
                <span className="font-medium">{recipe.nutrition.protein}g</span>
              </div>
              <Progress value={proteinPercent} className="h-2 bg-muted [&>div]:bg-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>脂質 (F)</span>
                <span className="font-medium">{recipe.nutrition.fat}g</span>
              </div>
              <Progress value={fatPercent} className="h-2 bg-muted [&>div]:bg-secondary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>炭水化物 (C)</span>
                <span className="font-medium">{recipe.nutrition.carbs}g</span>
              </div>
              <Progress value={carbPercent} className="h-2 bg-muted" />
            </div>
          </div>
        </section>

        <Separator />

        {/* 材料 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">材料 (1人前)</h2>
          <ul className="divide-y border rounded-xl overflow-hidden bg-card">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between p-4">
                <span>{ing.name}</span>
                <span className="text-muted-foreground font-medium">{ing.amount}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 手順 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">作り方</h2>
          <div className="space-y-6">
            {recipe.instructions.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <p className="pt-1 text-foreground leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-8 flex justify-center">
          <Button asChild variant="outline" className="rounded-full px-8">
            <Link href="/recipes">一覧に戻る</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}