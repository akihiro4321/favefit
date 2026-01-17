export type CuisineGenre = '和食' | '洋食' | '中華' | 'イタリアン' | 'エスニック' | 'その他';

export interface Mood {
  genre: CuisineGenre;
  tasteBalance: number; // 0: さっぱり, 100: こってり
  freeText?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cookingTime: number; // 分
  nutrition: Nutrition;
  ingredients: Ingredient[];
  steps: string[];
  genre: CuisineGenre;
  tasteLevel: number; // 0-100
}
