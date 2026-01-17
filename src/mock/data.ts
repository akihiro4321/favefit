import { Recipe } from '../types';

export const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: '彩り野菜のさっぱり和風パスタ',
    description: '旬の野菜をたっぷり使い、醤油とオリーブオイルで仕上げたヘルシーな一皿です。',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    cookingTime: 15,
    nutrition: {
      calories: 450,
      protein: 12,
      fat: 15,
      carbs: 65,
    },
    ingredients: [
      { name: 'スパゲッティ', amount: '80g' },
      { name: 'アスパラガス', amount: '2本' },
      { name: 'ミニトマト', amount: '4個' },
      { name: '醤油', amount: '大さじ1' },
    ],
    steps: [
      'パスタを規定時間通りに茹でる。',
      '野菜を一口大に切る。',
      'フライパンで野菜を炒め、パスタと醤油を合わせる。',
    ],
    genre: '和食',
    tasteLevel: 20,
  },
  {
    id: '2',
    title: 'ガッツリ濃厚！麻婆豆腐',
    description: '豆板醤の辛味と山椒の痺れが食欲をそそる、本格的な味わい。',
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&q=80',
    cookingTime: 20,
    nutrition: {
      calories: 380,
      protein: 25,
      fat: 22,
      carbs: 15,
    },
    ingredients: [
      { name: '絹ごし豆腐', amount: '1丁' },
      { name: '豚ひき肉', amount: '100g' },
      { name: '白ネギ', amount: '1/2本' },
      { name: '豆板醤', amount: '小さじ1' },
    ],
    steps: [
      '豆腐を2cm角に切り、下茹でする。',
      'ひき肉と調味料を炒め、豆腐を加える。',
      '水溶き片栗粉でとろみをつける。',
    ],
    genre: '中華',
    tasteLevel: 90,
  },
  {
    id: '3',
    title: '地中海風チキングリル',
    description: 'ハーブとレモンでマリネした鶏肉をジューシーに焼き上げました。',
    image: 'https://images.unsplash.com/photo-1532550905667-62e98a0d01d4?w=800&q=80',
    cookingTime: 25,
    nutrition: {
      calories: 520,
      protein: 35,
      fat: 18,
      carbs: 45,
    },
    ingredients: [
      { name: '鶏もも肉', amount: '200g' },
      { name: 'じゃがいも', amount: '1個' },
      { name: 'レモン', amount: '1/4個' },
      { name: 'ローズマリー', amount: '少々' },
    ],
    steps: [
      '鶏肉をハーブとレモンで30分置く。',
      'フライパンで皮目からパリッと焼く。',
      '付け合わせの野菜と共に盛り付ける。',
    ],
    genre: '洋食',
    tasteLevel: 50,
  },
];
