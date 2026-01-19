import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, Utensils } from 'lucide-react';

interface RecipeCardProps {
  recipe: {
    id: string;
    title: string;
    description: string;
    image?: string;
    cookingTime: number;
    nutrition: {
      calories: number;
    };
    genre?: string;
  };
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow relative group">
      <Link href={`/recipes/${recipe.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">{recipe.title}の詳細を見る</span>
      </Link>
      
      <div className="relative aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground transition-transform group-hover:scale-110">
            <Utensils className="h-12 w-12 mb-2 opacity-20" />
            <span className="text-xs font-medium opacity-50">Delicious Recipe</span>
          </div>
        )}
        {recipe.genre && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-black">
              {recipe.genre}
            </Badge>
          </div>
        )}
      </div>
      
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg line-clamp-1">{recipe.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {recipe.description}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{recipe.cookingTime}分</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="h-4 w-4" />
          <span>{recipe.nutrition.calories}kcal</span>
        </div>
      </CardFooter>
    </Card>
  );
}