'use client';

import { useAuth } from '@/components/auth-provider';
import { MoodSelector } from '@/components/mood-selector';
import { RecipeDisplay } from '@/components/recipe-display';
import { Mood } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Recipe } from '@/lib/agents/recipe-creator';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [generating, setGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [generating]);

  const loadingMessages = [
    "あなたの目標栄養素を分析中...",
    "冷蔵庫にありそうな食材を厳選中...",
    "最短ルートの調理工程を考案中...",
    "最後のおいしさのスパイスを検討中..."
  ];

  const handleMoodSubmit = async (mood: Mood) => {
    if (!profile?.onboardingCompleted) {
      alert('先にプロフィールから栄養目標を設定してください。');
      router.push('/profile');
      return;
    }

    setGenerating(true);
    setGeneratedRecipe(null);

    try {
      const input = {
        mood: `${mood.genre}気分。味のバランスは100中${mood.tasteBalance}（${mood.tasteBalance < 40 ? "さっぱり" : mood.tasteBalance > 60 ? "こってり" : "ふつう"}）。具体的には「${mood.freeText || 'おまかせ'}」を希望。`,
        targetNutrition: {
          calories: Math.round(profile.daily_calorie_target! / 3),
          protein: Math.round(profile.protein_g! / 3),
          fat: Math.round(profile.fat_g! / 3),
          carbs: Math.round(profile.carbs_g! / 3),
        }
      };

      const res = await fetch('/api/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'recipe-creator', input }),
      });

      if (!res.ok) throw new Error('生成に失敗しました');
      const recipe = await res.json();
      setGeneratedRecipe(recipe);
    } catch (error) {
      console.error(error);
      alert('レシピの生成中にエラーが発生しました。');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
      {!generatedRecipe && !generating && (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary">FaveFit</h1>
            <p className="text-muted-foreground italic">今の気分に合わせて、AIが最適なレシピを提案します。</p>
          </div>
          <MoodSelector onSubmit={handleMoodSubmit} />
        </div>
      )}

      {generating && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-tighter">Chef AI</span>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{loadingMessages[loadingStep]}</h2>
            <p className="text-sm text-muted-foreground animate-pulse">
              Gemini があなたにぴったりの時短レシピを組み立てています。
            </p>
          </div>
        </div>
      )}

      {generatedRecipe && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setGeneratedRecipe(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              選び直す
            </Button>
            <h2 className="text-xl font-bold">提案されたレシピ</h2>
          </div>
          <RecipeDisplay recipe={generatedRecipe} />
          <div className="flex gap-4 pt-4">
            <Button className="flex-1 h-12 rounded-full" onClick={() => alert('この機能は開発中です（Preference Learner トラックで実装）')}>
              これに決めた！
            </Button>
            <Button variant="outline" className="flex-1 h-12 rounded-full" onClick={() => handleMoodSubmit({ genre: '和食', tasteBalance: 50, freeText: undefined })}>
              別のを提案して
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
