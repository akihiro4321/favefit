"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  History,
  Heart,
  ChefHat,
  ChevronRight,
} from "lucide-react";
import { getRecipeHistory, getFavorites } from "@/lib/recipeHistory";
import { RecipeHistoryItem, FavoriteRecipe } from "@/lib/schema";
import Link from "next/link";

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<RecipeHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [historyData, favoritesData] = await Promise.all([
          getRecipeHistory(user.uid),
          getFavorites(user.uid),
        ]);
        setHistory(historyData);
        setFavorites(favoritesData);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setFetching(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
      {/* ヘッダー */}
      <div className="space-y-2 animate-slide-up">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          レシピ履歴
        </h1>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">すべて</TabsTrigger>
          <TabsTrigger value="favorites">お気に入り</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3 mt-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>まだレシピがありません</p>
            </div>
          ) : (
            history.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-3 mt-4">
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>お気に入りがありません</p>
            </div>
          ) : (
            favorites.map((recipe) => (
              <FavoriteCard key={recipe.id} recipe={recipe} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeHistoryItem }) {
  const wasCooked = recipe.cookedAt !== null;

  return (
    <Link href={`/recipe/${recipe.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-all">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{recipe.title}</h3>
                {wasCooked && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-secondary/80"
                  >
                    <ChefHat className="w-3 h-3 mr-1" />
                    作った
                  </Badge>
                )}
                {recipe.isFavorite && (
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {recipe.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {recipe.nutrition.calories} kcal
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FavoriteCard({ recipe }: { recipe: FavoriteRecipe }) {
  return (
    <Link href={`/recipe/${recipe.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-all">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <h3 className="font-medium">{recipe.title}</h3>
              </div>
              <div className="flex flex-wrap gap-1">
                {recipe.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {recipe.cookedCount}回作成
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
