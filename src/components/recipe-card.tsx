import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame } from 'lucide-react';
import { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
      <div className="relative aspect-video w-full">
        <Image
          src={recipe.image}
          alt={recipe.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-black">
            {recipe.genre}
          </Badge>
        </div>
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
        <Link 
          href={`/recipes/${recipe.id}`}
          className="text-primary font-medium hover:underline"
        >
          詳細を見る
        </Link>
      </CardFooter>
    </Card>
  );
}
