'use client';

import { useAuth } from '@/components/auth-provider';
import { RecipeCard } from '@/components/recipe-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SavedRecipe {
  id: string;
  title: string;
  description: string;
  cookingTime: number;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  ingredients: Array<{ name: string; amount: string }>;
  instructions: string[];
}

export default function RecipesPage() {
  const { user, loading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function loadRecipes() {
      if (user) {
        setLoading(true);
        const res = await fetch('/api/recipe/get-saved-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, pageSize: 20, page: 1 }),
        });
        const data = await res.json();
        setRecipes(data.data?.recipes || []);
        setHasMore(data.data?.hasMore || false);
        setCurrentPage(1);
        setLoading(false);
      }
    }
    if (!authLoading) {
      loadRecipes();
    }
  }, [user, authLoading]);

  async function loadMoreRecipes() {
    if (!user || !hasMore) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;
    const res = await fetch('/api/recipe/get-saved-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, pageSize: 20, page: nextPage }),
    });
    const data = await res.json();
    setRecipes([...recipes, ...(data.data?.recipes || [])]);
    setHasMore(data.data?.hasMore || false);
    setCurrentPage(nextPage);
    setLoadingMore(false);
  }

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

      {hasMore && recipes.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={loadMoreRecipes}
            disabled={loadingMore}
            variant="outline"
            className="rounded-full"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                読み込み中...
              </>
            ) : (
              'さらに読み込む'
            )}
          </Button>
        </div>
      )}

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