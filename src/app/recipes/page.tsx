'use client';

import { useAuth } from '@/components/auth-provider';
import { RecipeCard } from '@/components/recipe-card';
import { Button } from '@/components/ui/button';
import { getSavedRecipes, SavedRecipe } from '@/lib/recipe';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function RecipesPage() {
  const { user, loading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecipes() {
      if (user) {
        setLoading(true);
        const data = await getSavedRecipes(user.uid);
        setRecipes(data);
        setLoading(false);
      }
    }
    if (!authLoading) {
      loadRecipes();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">保存したレシピ</h1>
      </div>

      <p className="text-muted-foreground">
        これまでに生成・保存したレシピが {recipes.length} 件あります。
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-20 space-y-4 bg-muted/30 rounded-2xl border-2 border-dashed">
          <p className="text-xl font-medium">まだ保存されたレシピがありません。</p>
          <p className="text-sm text-muted-foreground">
            ホーム画面で今の気分を入力して、レシピを生成してみましょう。
          </p>
          <Button asChild className="rounded-full">
            <Link href="/home">レシピを生成する</Link>
          </Button>
        </div>
      )}
    </div>
  );
}