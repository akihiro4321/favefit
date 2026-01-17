import { mockRecipes } from '@/mock/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Clock, Flame, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const recipe = mockRecipes.find((r) => r.id === id);

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

  // PFCバランスの計算 (簡易的な割合)
  const totalGrams = recipe.nutrition.protein + recipe.nutrition.fat + recipe.nutrition.carbs;
  const proteinPercent = (recipe.nutrition.protein / totalGrams) * 100;
  const fatPercent = (recipe.nutrition.fat / totalGrams) * 100;
  const carbPercent = (recipe.nutrition.carbs / totalGrams) * 100;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* 戻るボタン */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/recipes">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold line-clamp-1">{recipe.title}</h1>
      </div>

      {/* メイン画像 */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 shadow-md">
        <Image
          src={recipe.image}
          alt={recipe.title}
          fill
          className="object-cover"
        />
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-primary text-primary-foreground text-sm py-1 px-3">
            {recipe.genre}
          </Badge>
        </div>
      </div>

      <div className="space-y-8">
        {/* 基本情報 */}
        <section className="space-y-4">
          <p className="text-lg text-muted-foreground leading-relaxed">
            {recipe.description}
          </p>
          <div className="flex gap-6 items-center bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-medium">{recipe.cookingTime}分</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-secondary" />
              <span className="font-medium">{recipe.nutrition.calories}kcal</span>
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
          <ul className="divide-y border rounded-xl overflow-hidden">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between p-4 bg-white dark:bg-zinc-950">
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
            {recipe.steps.map((step, i) => (
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

        {/* アクションボタン (プレースホルダー) */}
        <div className="pt-8 grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-12 rounded-full">
            あとで見る
          </Button>
          <Button className="h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
            調理完了！
          </Button>
        </div>
      </div>
    </div>
  );
}
