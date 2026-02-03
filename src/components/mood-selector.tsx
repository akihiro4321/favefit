'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mood, CuisineGenre } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { RecommendedTags } from './recommended-tags';

const genres: CuisineGenre[] = ['和食', '洋食', '中華', 'イタリアン', 'エスニック', 'その他'];

interface MoodSelectorProps {
  onSubmit: (mood: Mood) => void;
}

export function MoodSelector({ onSubmit }: MoodSelectorProps) {
  const [selectedGenre, setSelectedGenre] = useState<CuisineGenre>('和食');
  const [tasteBalance, setTasteBalance] = useState<number>(50);
  const [freeText, setFreeText] = useState<string>('');

  const handleSubmit = () => {
    onSubmit({
      genre: selectedGenre,
      tasteBalance,
      freeText: freeText.trim() || undefined,
    });
  };

  const handleTagSelect = (tag: string) => {
    if (freeText.includes(tag)) return;
    setFreeText(prev => prev ? `${prev}, ${tag}` : tag);
  };

  return (
    <div className="space-y-8 w-full max-w-2xl mx-auto p-4">
      {/* ジャンル選択 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-center sm:text-left">今の気分は？</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {genres.map((genre) => (
            <Card
              key={genre}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                selectedGenre === genre ? "border-2 border-primary bg-primary/5 shadow-md" : "border-border"
              )}
              onClick={() => setSelectedGenre(genre)}
            >
              <CardContent className="p-4 flex items-center justify-center h-20 text-center">
                <span className={cn(
                  "font-medium",
                  selectedGenre === genre ? "text-primary" : "text-foreground"
                )}>
                  {genre}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 味のバランス */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <Label className="text-lg font-semibold">味の好みは？</Label>
          <span className="text-sm text-muted-foreground">
            {tasteBalance < 40 ? "さっぱり" : tasteBalance > 60 ? "こってり" : "ふつう"}
          </span>
        </div>
        <div className="space-y-4">
          <Slider
            value={[tasteBalance]}
            onValueChange={(vals) => setTasteBalance(vals[0])}
            max={100}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>さっぱり</span>
            <span>こってり</span>
          </div>
        </div>
      </section>

      {/* フリーテキスト入力 */}
      <section className="space-y-4">
        <Label htmlFor="freeText" className="text-lg font-semibold">具体的に食べたいものは？（任意）</Label>
        <RecommendedTags onSelect={handleTagSelect} />
        <Input
          id="freeText"
          placeholder="例：旬の野菜、温かいスープ..."
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          className="h-12"
        />
      </section>

      {/* 送信ボタン */}
      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg transition-transform active:scale-[0.98]"
        >
          レシピを見る
        </Button>
      </div>
    </div>
  );
}
