import { mockRecipes } from '@/mock/data';
import { RecipeCard } from '@/components/recipe-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function RecipesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">おすすめのレシピ</h1>
      </div>

      <p className="text-muted-foreground">
        今の気分にぴったりのレシピを {mockRecipes.length} 件見つけました。
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {mockRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {mockRecipes.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <p className="text-xl font-medium">条件に合うレシピが見つかりませんでした。</p>
          <Button asChild variant="outline">
            <Link href="/">気分を選び直す</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
